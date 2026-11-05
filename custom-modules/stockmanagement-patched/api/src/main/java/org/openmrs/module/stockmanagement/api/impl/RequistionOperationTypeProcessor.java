/*
 * The contents of this file are subject to the OpenMRS Public License
 * Version 2.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and
 * limitations under the License.
 *
 * Copyright (C) OpenHMIS.  All Rights Reserved.
 */
package org.openmrs.module.stockmanagement.api.impl;

import org.openmrs.module.stockmanagement.api.StockOperationPrivelegeTarget;
import org.openmrs.module.stockmanagement.api.model.Party;
import org.openmrs.module.stockmanagement.api.model.StockOperation;
import org.openmrs.module.stockmanagement.api.model.StockOperationType;

import java.math.BigDecimal;

/**
 * A requisition is a location (the source) asking a store (the destination, "Request stock from")
 * for stock. Once approved it moves the requested batches out of that store and into the
 * requesting location in one step, like a completed transfer - no Stock Issue or receipt follows.
 * <p>
 * Nothing moves before then: submitting only reserves the lines, and approval re-checks the
 * store's balance, because other operations may have drawn on the same batches in between.
 * <p>
 * Requisitions made before this change carry no batches and so reserve nothing; approving one
 * still moves no stock and it is fulfilled through a Stock Issue as before.
 */
public class RequistionOperationTypeProcessor extends StockOperationTypeProcessorBase {
	
	public RequistionOperationTypeProcessor(StockOperationType stockOperationType) {
		super(stockOperationType);
	}
	
	@Override
	public boolean isNegativeItemQuantityAllowed() {
		return false;
	}
	
	@Override
	public boolean shouldVerifyNegativeStockAmountsAtSource() {
		return true;
	}
	
	@Override
	public boolean appliesStockAtCompletion() {
		return true;
	}
	
	@Override
	public BigDecimal getQuantityToApplyAtSource(BigDecimal quantity) {
		return quantity.negate();
	}
	
	@Override
	public Party getPartyStockIsTakenFrom(StockOperation operation) {
		return operation.getDestination();
	}
	
	@Override
	public StockOperationPrivelegeTarget getApprovalPrivilegeTarget() {
		return StockOperationPrivelegeTarget.Destination;
	}
	
	@Override
	public void onPending(final StockOperation operation) {
		// Stock moves only on approval; the reserved lines wait for onCompleted.
	}
	
	@Override
	public void onCancelled(final StockOperation operation) {
		if (operation.getReservedTransactions() != null) {
			clearReservedTransactions(operation);
		}
	}
	
	@Override
	public void onCompleted(final StockOperation operation) {
		if (operation.getReservedTransactions() == null) {
			return;
		}
		// Out of the supplying store...
		executeCopyReserved(operation, (reserved, tx) -> {
			tx.setParty(operation.getDestination());
			tx.setQuantity(tx.getQuantity().negate());
		});
		// ...and into the location that asked for it.
		executeCopyReservedAndClear(operation, (reserved, tx) -> tx.setParty(operation.getSource()));
	}
}
