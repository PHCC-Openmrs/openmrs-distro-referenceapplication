package org.openmrs.module.stockmanagement.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.Location;
import org.openmrs.api.APIAuthenticationException;
import org.openmrs.api.context.Context;
import org.openmrs.module.stockmanagement.api.ModuleConstants;
import org.openmrs.module.stockmanagement.api.StockManagementService;
import org.openmrs.module.stockmanagement.api.dto.StockItemInventory;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Every stock item's quantity on hand at a location in one request, instead of one
 * {@code stockiteminventory?stockItemUuid=...&locationUuid=...&groupBy=StockItemOnly} request per item:
 *
 * <pre>
 * GET /ws/rest/v1/stockmanagement/itemquantities?locationUuid=...
 * → 200 { "results": [ { "stockItemUuid", "quantity", "quantityUoM", "quantityUoMUuid", "quantityFactor" } ] }
 * </pre>
 *
 * Each row holds the values the per-item request returns as its first result: the quantity in non-expired batches,
 * expressed in the item's preferred packaging unit (quantityUoM, e.g. Box), and that unit's factor to the dispensing
 * unit. Items with no stock transactions at the location have no row (the per-item request returns no result for
 * them). The result is empty when the location has no stock party or the user may not see its stock.
 */
@Controller("stockmanagement.StockItemQuantitiesController")
@RequestMapping("/rest/" + RestConstants.VERSION_1 + "/" + ModuleConstants.MODULE_ID + "/itemquantities")
public class StockItemQuantitiesController {

	private static final Log log = LogFactory.getLog(StockItemQuantitiesController.class);

	private final ObjectMapper objectMapper = new ObjectMapper();

	@RequestMapping(method = RequestMethod.GET)
	public ResponseEntity<String> get(@RequestParam(value = "locationUuid", required = false) String locationUuid) {
		if (!Context.isAuthenticated()) {
			return error(HttpStatus.UNAUTHORIZED, "Not logged in");
		}
		if (StringUtils.isBlank(locationUuid)) {
			return error(HttpStatus.BAD_REQUEST, "locationUuid is required");
		}
		try {
			Location location = Context.getLocationService().getLocationByUuid(locationUuid);
			if (location == null) {
				return error(HttpStatus.NOT_FOUND, "No location with uuid " + locationUuid);
			}
			List<StockItemInventory> rows = Context.getService(StockManagementService.class).getStockItemQuantities(
			    location);
			ObjectNode result = objectMapper.createObjectNode();
			ArrayNode results = result.putArray("results");
			for (StockItemInventory row : rows) {
				if (row.getStockItemUuid() == null) {
					continue;
				}
				ObjectNode node = results.addObject();
				node.put("stockItemUuid", row.getStockItemUuid());
				// Unscaled, as the stockiteminventory resource writes them (e.g. 6.00000 and 30.00).
				node.put("quantity", row.getQuantity());
				node.put("quantityUoM", row.getQuantityUoM());
				node.put("quantityUoMUuid", row.getQuantityUoMUuid());
				node.put("quantityFactor", row.getQuantityFactor());
			}
			return json(HttpStatus.OK, result.toString());
		}
		catch (APIAuthenticationException e) {
			return error(HttpStatus.FORBIDDEN, e.getMessage());
		}
		catch (Exception e) {
			log.error("Building the stock item quantities failed", e);
			return error(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage() == null ? e.getClass().getSimpleName()
			        : e.getMessage());
		}
	}

	private ResponseEntity<String> error(HttpStatus status, String message) {
		ObjectNode error = objectMapper.createObjectNode();
		error.putObject("error").put("message", message).put("code", String.valueOf(status.value()));
		return json(status, error.toString());
	}

	private static ResponseEntity<String> json(HttpStatus status, String body) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(new MediaType("application", "json", StandardCharsets.UTF_8));
		return new ResponseEntity<>(body, headers, status);
	}
}
