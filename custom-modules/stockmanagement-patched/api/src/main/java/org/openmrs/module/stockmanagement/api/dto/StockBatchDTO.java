package org.openmrs.module.stockmanagement.api.dto;

import java.util.Date;

public class StockBatchDTO {
	
	private Integer id;
	
	private String batchNo;
	
	private Date expiration;
	
	private String uuid;
	
	private String stockItemUuid;
	
	private boolean voided;
	
	private Date expiryNotificationDate;
	
	// The packed PO/PR/Fund code reference (StockOperation.externalReference) of the earliest
	// completed Opening Stock/Receipt that brought this batch in. Not a column - filled in after
	// the search so operations drawing from the batch can show where it came from.
	private String originExternalReference;
	
	public Integer getId() {
		return id;
	}
	
	public void setId(Integer id) {
		this.id = id;
	}
	
	public String getBatchNo() {
		return batchNo;
	}
	
	public void setBatchNo(String batchNo) {
		this.batchNo = batchNo;
	}
	
	public Date getExpiration() {
		return expiration;
	}
	
	public void setExpiration(Date expiration) {
		this.expiration = expiration;
	}
	
	public String getUuid() {
		return uuid;
	}
	
	public void setUuid(String uuid) {
		this.uuid = uuid;
	}
	
	public String getStockItemUuid() {
		return stockItemUuid;
	}
	
	public void setStockItemUuid(String stockItemUuid) {
		this.stockItemUuid = stockItemUuid;
	}
	
	public boolean isVoided() {
		return voided;
	}
	
	public void setVoided(boolean voided) {
		this.voided = voided;
	}
	
	public Date getExpiryNotificationDate() {
		return expiryNotificationDate;
	}
	
	public void setExpiryNotificationDate(Date expiryNotificationDate) {
		this.expiryNotificationDate = expiryNotificationDate;
	}
	
	public String getOriginExternalReference() {
		return originExternalReference;
	}
	
	public void setOriginExternalReference(String originExternalReference) {
		this.originExternalReference = originExternalReference;
	}
}
