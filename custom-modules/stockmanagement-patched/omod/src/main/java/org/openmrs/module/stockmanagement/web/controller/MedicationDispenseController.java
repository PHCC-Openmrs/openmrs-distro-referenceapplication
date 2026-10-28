package org.openmrs.module.stockmanagement.web.controller;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.DataFormatException;
import ca.uhn.fhir.parser.IParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.MedicationDispense;
import org.openmrs.Order;
import org.openmrs.api.APIAuthenticationException;
import org.openmrs.api.ValidationException;
import org.openmrs.api.context.Context;
import org.openmrs.module.fhir2.api.translators.MedicationDispenseTranslator;
import org.openmrs.module.stockmanagement.api.MedicationDispenseNotFoundException;
import org.openmrs.module.stockmanagement.api.MedicationDispenseStockService;
import org.openmrs.module.stockmanagement.api.ModuleConstants;
import org.openmrs.module.stockmanagement.api.StockManagementException;
import org.openmrs.module.stockmanagement.api.dto.DispenseStockLine;
import org.openmrs.module.stockmanagement.api.dto.MedicationDispenseRequest;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Saves dispenses together with their stock in one transaction (see {@link MedicationDispenseStockService}).
 * The dispensing app sends the same FHIR MedicationDispense it used to post to the FHIR API, plus the
 * prescription status to set and the batches to take stock from:
 *
 * <pre>
 * POST /ws/rest/v1/stockmanagement/dispense
 * { "dispenses": [ { "medicationDispense": { FHIR MedicationDispense, "id": client-generated uuid },
 *                    "update": true,                        (only when editing)
 *                    "fulfillerStatus": "COMPLETED",        (absent = unchanged, null = cleared)
 *                    "restrictTotalQuantityDispensed": true,
 *                    "stock": [ { "stockItem", "stockBatch", "stockItemPackagingUOM", "dispenseLocation", "quantity" } ] } ] }
 * → 200 { "dispenses": [ saved FHIR MedicationDispense, ... ] }
 *
 * DELETE /ws/rest/v1/stockmanagement/dispense/{uuid}   body (optional): { "fulfillerStatus": ..., "reason": ... }
 * </pre>
 *
 * On any error nothing is saved. 409 means the request waited too long for, or deadlocked on, a lock held
 * by another dispense; it is safe to send again unchanged.
 */
@Controller("stockmanagement.MedicationDispenseController")
@RequestMapping("/rest/" + RestConstants.VERSION_1 + "/" + ModuleConstants.MODULE_ID + "/dispense")
public class MedicationDispenseController {

	private static final Log log = LogFactory.getLog(MedicationDispenseController.class);

	/** MariaDB/MySQL error codes for "lock wait timeout exceeded" and "deadlock found". */
	private static final int LOCK_WAIT_TIMEOUT = 1205;

	private static final int DEADLOCK = 1213;

	/** A duplicate key: two copies of the same new dispense raced each other. */
	private static final int DUPLICATE_KEY = 1062;

	private final ObjectMapper objectMapper = new ObjectMapper();

	@RequestMapping(method = RequestMethod.POST)
	public ResponseEntity<String> save(@RequestBody String body) {
		if (!Context.isAuthenticated()) {
			return error(HttpStatus.UNAUTHORIZED, "Not logged in");
		}
		try {
			JsonNode items = objectMapper.readTree(body).path("dispenses");
			if (!items.isArray() || items.size() == 0) {
				return error(HttpStatus.BAD_REQUEST, "\"dispenses\" must list at least one dispense");
			}
			IParser parser = FhirContext.forR4Cached().newJsonParser();
			MedicationDispenseTranslator<MedicationDispense> translator = translator();
			List<MedicationDispenseRequest> requests = new ArrayList<>();
			for (JsonNode item : items) {
				requests.add(toRequest(item, parser, translator));
			}

			List<MedicationDispense> saved = Context.getService(MedicationDispenseStockService.class)
			        .saveMedicationDispenses(requests);

			StringBuilder json = new StringBuilder("{\"dispenses\":[");
			for (int i = 0; i < saved.size(); i++) {
				if (i > 0) {
					json.append(',');
				}
				json.append(parser.encodeResourceToString(translator.toFhirResource(saved.get(i))));
			}
			return json(HttpStatus.OK, json.append("]}").toString());
		}
		catch (Exception e) {
			return handle(e);
		}
	}

	@RequestMapping(value = "/{uuid}", method = RequestMethod.DELETE)
	public ResponseEntity<String> delete(@PathVariable("uuid") String uuid,
	        @RequestBody(required = false) String body) {
		if (!Context.isAuthenticated()) {
			return error(HttpStatus.UNAUTHORIZED, "Not logged in");
		}
		try {
			JsonNode root = StringUtils.isBlank(body) ? objectMapper.createObjectNode() : objectMapper.readTree(body);
			boolean statusSpecified = root.has("fulfillerStatus");
			MedicationDispense dispense = Context.getService(MedicationDispenseStockService.class).voidMedicationDispense(
			    uuid, statusSpecified, statusSpecified ? toFulfillerStatus(root.get("fulfillerStatus")) : null,
			    root.hasNonNull("reason") ? root.get("reason").asText() : null);

			ObjectNode result = objectMapper.createObjectNode();
			result.put("uuid", dispense.getUuid());
			result.put("voided", true);
			return json(HttpStatus.OK, result.toString());
		}
		catch (Exception e) {
			return handle(e);
		}
	}

	private MedicationDispenseRequest toRequest(JsonNode item, IParser parser,
	        MedicationDispenseTranslator<MedicationDispense> translator) {
		JsonNode resourceJson = item.path("medicationDispense");
		if (!resourceJson.isObject()) {
			throw new IllegalArgumentException("Each dispense needs a \"medicationDispense\" resource");
		}
		org.hl7.fhir.r4.model.MedicationDispense resource = parser.parseResource(
		    org.hl7.fhir.r4.model.MedicationDispense.class, resourceJson.toString());

		MedicationDispenseRequest request = new MedicationDispenseRequest();
		request.setUuid(resource.getIdElement().getIdPart());
		request.setOrderUuid(resource.getAuthorizingPrescriptionFirstRep().getReferenceElement().getIdPart());
		request.setUpdate(item.path("update").asBoolean(false));
		// Translated inside the service's transaction, after its locks are taken.
		request.setBuilder(existing -> existing == null ? translator.toOpenmrsType(resource) : translator.toOpenmrsType(
		    existing, resource));
		if (item.has("fulfillerStatus")) {
			request.setFulfillerStatusSpecified(true);
			request.setFulfillerStatus(toFulfillerStatus(item.get("fulfillerStatus")));
		}
		request.setRestrictTotalQuantityDispensed(item.path("restrictTotalQuantityDispensed").asBoolean(false));
		for (JsonNode lineJson : item.path("stock")) {
			DispenseStockLine line = new DispenseStockLine();
			line.setStockItemUuid(text(lineJson, "stockItem"));
			line.setStockBatchUuid(text(lineJson, "stockBatch"));
			line.setStockItemPackagingUOMUuid(text(lineJson, "stockItemPackagingUOM"));
			line.setLocationUuid(text(lineJson, "dispenseLocation"));
			line.setQuantity(lineJson.hasNonNull("quantity") ? new BigDecimal(lineJson.get("quantity").asText()) : null);
			request.getStockLines().add(line);
		}
		return request;
	}

	private static Order.FulfillerStatus toFulfillerStatus(JsonNode value) {
		return value == null || value.isNull() ? null : Order.FulfillerStatus.valueOf(value.asText());
	}

	private static String text(JsonNode node, String field) {
		return node.hasNonNull(field) ? node.get(field).asText() : null;
	}

	@SuppressWarnings("unchecked")
	private static MedicationDispenseTranslator<MedicationDispense> translator() {
		List<MedicationDispenseTranslator> translators = Context.getRegisteredComponents(MedicationDispenseTranslator.class);
		if (translators.isEmpty()) {
			throw new IllegalStateException("The FHIR module's MedicationDispense translator is not available");
		}
		return translators.get(0);
	}

	private ResponseEntity<String> handle(Exception e) {
		if (isLockConflict(e)) {
			log.warn("Dispense not saved because of a lock conflict; the client can retry", e);
			return error(HttpStatus.CONFLICT, "Another dispense for the same prescription or stock batch was being "
			        + "saved at the same moment. Nothing was saved; please try again.");
		}
		if (e instanceof MedicationDispenseNotFoundException) {
			return error(HttpStatus.NOT_FOUND, e.getMessage());
		}
		if (e instanceof StockManagementException || e instanceof ValidationException
		        || e instanceof IllegalArgumentException || e instanceof DataFormatException || e instanceof IOException) {
			return error(HttpStatus.BAD_REQUEST, e.getMessage());
		}
		if (e instanceof APIAuthenticationException) {
			return error(HttpStatus.FORBIDDEN, e.getMessage());
		}
		log.error("Saving a dispense failed", e);
		return error(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage() == null ? e.getClass().getSimpleName()
		        : e.getMessage());
	}

	/**
	 * Whether the failure was a lock wait timeout or a deadlock, or two copies of the same new dispense racing:
	 * in each case the whole transaction was rolled back and sending the same request again is safe.
	 */
	private static boolean isLockConflict(Throwable e) {
		for (Throwable cause = e; cause != null; cause = cause.getCause() == cause ? null : cause.getCause()) {
			if (cause instanceof SQLException) {
				SQLException sqlException = (SQLException) cause;
				if (sqlException.getErrorCode() == LOCK_WAIT_TIMEOUT || sqlException.getErrorCode() == DEADLOCK
				        || "40001".equals(sqlException.getSQLState())) {
					return true;
				}
				if (sqlException.getErrorCode() == DUPLICATE_KEY
				        && StringUtils.containsIgnoreCase(sqlException.getMessage(), "medication_dispense")) {
					return true;
				}
			}
		}
		return false;
	}

	private ResponseEntity<String> error(HttpStatus status, String message) {
		ObjectNode error = objectMapper.createObjectNode();
		error.putObject("error").put("message", message).put("code", String.valueOf(status.value()));
		return json(status, error.toString());
	}

	private static ResponseEntity<String> json(HttpStatus status, String body) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(new MediaType("application", "json", java.nio.charset.StandardCharsets.UTF_8));
		return new ResponseEntity<>(body, headers, status);
	}
}
