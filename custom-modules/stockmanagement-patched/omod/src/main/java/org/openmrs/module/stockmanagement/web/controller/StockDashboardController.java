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
import org.openmrs.module.stockmanagement.api.dto.StockDashboardSummary;
import org.openmrs.module.stockmanagement.api.dto.StockItemDTO;
import org.openmrs.module.stockmanagement.api.dto.StockOperationDTO;
import org.openmrs.module.stockmanagement.api.dto.StockOperationItemDTO;
import org.openmrs.module.stockmanagement.api.utils.DateUtil;
import org.openmrs.module.webservices.rest.web.RestConstants;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

/**
 * The stock management Overview page in one request, instead of one inventory request per stock item:
 *
 * <pre>
 * GET /ws/rest/v1/stockmanagement/dashboardsummary?locationUuid=...
 * → 200 { "outOfStockItems":   [ item level ],
 *         "understockedItems": [ item level ],
 *         "outOfStockHistory": [ { "daysAgo": 28, "outOfStockCount": n }, ..., { "daysAgo": 0, ... } ],
 *         "expiringBatches":   [ { "stockItemUuid", "displayName", "drugName", "dispensingUnitName",
 *                                  "stockBatchUuid", "batchNo", "expiration", "quantity", "quantityUoM" } ],
 *         "disposals":         [ { "uuid", "reasonName", "sourceName", "operationDate",
 *                                  "stockOperationItems": [ { "stockItemName", "stockItemPackagingUOMName",
 *                                                             "quantity" } ] } ] }
 * item level = { "uuid", "displayName", "quantity", "quantityUoM", "reorderLevel", "reorderLevelUoMUuid",
 *                "hasExpiration" }
 * </pre>
 */
@Controller("stockmanagement.StockDashboardController")
@RequestMapping("/rest/" + RestConstants.VERSION_1 + "/" + ModuleConstants.MODULE_ID + "/dashboardsummary")
public class StockDashboardController {

	private static final Log log = LogFactory.getLog(StockDashboardController.class);

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
			StockDashboardSummary summary = Context.getService(StockManagementService.class).getStockDashboardSummary(
			    location);
			return json(HttpStatus.OK, toJson(summary).toString());
		}
		catch (APIAuthenticationException e) {
			return error(HttpStatus.FORBIDDEN, e.getMessage());
		}
		catch (Exception e) {
			log.error("Building the stock dashboard summary failed", e);
			return error(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage() == null ? e.getClass().getSimpleName()
			        : e.getMessage());
		}
	}

	private ObjectNode toJson(StockDashboardSummary summary) {
		ObjectNode result = objectMapper.createObjectNode();
		addItemLevels(result.putArray("outOfStockItems"), summary.getOutOfStockItems());
		addItemLevels(result.putArray("understockedItems"), summary.getUnderstockedItems());

		ArrayNode history = result.putArray("outOfStockHistory");
		for (StockDashboardSummary.HistoryPoint point : summary.getOutOfStockHistory()) {
			history.addObject().put("daysAgo", point.getDaysAgo()).put("outOfStockCount", point.getOutOfStockCount());
		}

		ArrayNode batches = result.putArray("expiringBatches");
		for (StockDashboardSummary.ExpiringBatch batch : summary.getExpiringBatches()) {
			StockItemDTO stockItem = batch.getStockItem();
			ObjectNode node = batches.addObject();
			node.put("stockItemUuid", stockItem.getUuid());
			node.put("displayName", displayName(stockItem));
			node.put("drugName", stockItem.getDrugName());
			node.put("dispensingUnitName", stockItem.getDispensingUnitName());
			node.put("stockBatchUuid", batch.getStockBatchUuid());
			node.put("batchNo", batch.getBatchNo());
			node.put("expiration", format(batch.getExpiration()));
			putNumber(node, "quantity", batch.getQuantity());
			node.put("quantityUoM", batch.getQuantityUoM());
		}

		ArrayNode disposals = result.putArray("disposals");
		for (StockOperationDTO operation : summary.getDisposals()) {
			ObjectNode node = disposals.addObject();
			node.put("uuid", operation.getUuid());
			node.put("reasonName", operation.getReasonName());
			node.put("sourceName", operation.getSourceName());
			node.put("operationDate", format(operation.getOperationDate()));
			ArrayNode items = node.putArray("stockOperationItems");
			if (operation.getStockOperationItems() != null) {
				for (StockOperationItemDTO item : operation.getStockOperationItems()) {
					ObjectNode itemNode = items.addObject();
					itemNode.put("stockItemName", item.getStockItemName());
					itemNode.put("stockItemPackagingUOMName", item.getStockItemPackagingUOMName());
					putNumber(itemNode, "quantity", item.getQuantity());
				}
			}
		}
		return result;
	}

	private void addItemLevels(ArrayNode array, List<StockDashboardSummary.ItemLevel> levels) {
		for (StockDashboardSummary.ItemLevel level : levels) {
			StockItemDTO stockItem = level.getStockItem();
			ObjectNode node = array.addObject();
			node.put("uuid", stockItem.getUuid());
			node.put("displayName", displayName(stockItem));
			putNumber(node, "quantity", level.getQuantity());
			node.put("quantityUoM", level.getQuantityUoM());
			putNumber(node, "reorderLevel", stockItem.getReorderLevel());
			node.put("reorderLevelUoMUuid", stockItem.getReorderLevelUoMUuid());
			node.put("hasExpiration", Boolean.TRUE.equals(stockItem.getHasExpiration()));
		}
	}

	/** The name the page shows for an item: its common name, else the drug's, else the concept's. */
	private static String displayName(StockItemDTO stockItem) {
		if (StringUtils.isNotBlank(stockItem.getCommonName())) {
			return stockItem.getCommonName();
		}
		if (StringUtils.isNotBlank(stockItem.getDrugName())) {
			return stockItem.getDrugName();
		}
		if (StringUtils.isNotBlank(stockItem.getConceptName())) {
			return stockItem.getConceptName();
		}
		return stockItem.getUuid();
	}

	/** Numbers without the trailing zeros of the 5-decimal unit conversion (2.00000 → 2). */
	private static void putNumber(ObjectNode node, String field, BigDecimal value) {
		if (value == null) {
			node.putNull(field);
		} else {
			BigDecimal stripped = value.stripTrailingZeros();
			node.put(field, stripped.scale() < 0 ? stripped.setScale(0) : stripped);
		}
	}

	private static String format(Date date) {
		return date == null ? null : new SimpleDateFormat(DateUtil.DATE_FORMAT).format(date);
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
