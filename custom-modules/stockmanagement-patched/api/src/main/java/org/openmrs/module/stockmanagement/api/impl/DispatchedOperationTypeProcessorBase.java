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
 */
package org.openmrs.module.stockmanagement.api.impl;

import org.openmrs.module.stockmanagement.api.model.StockOperation;
import org.openmrs.module.stockmanagement.api.model.StockOperationStatus;
import org.openmrs.module.stockmanagement.api.model.StockOperationType;

import java.math.BigDecimal;

/**
 * A type that sends stock from its source to its destination in two steps: the source dispatches
 * it, the destination receives it. Stock Issue and Return.
 * <p>
 * Submitting only reserves the lines. The stock leaves the source when the operation is
 * dispatched - that is its approval - and reaches the destination when it is received. Until it
 * is dispatched, cancelling, rejecting or returning it moves nothing.
 * <p>
 * Operations submitted before this change already took their stock out at submission; dispatching
 * one does not take it again, and cancelling one puts it back.
 */
public abstract class DispatchedOperationTypeProcessorBase extends StockOperationTypeProcessorBase {

	public DispatchedOperationTypeProcessorBase(StockOperationType stockOperationType) {
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
	public boolean requiresDispatchAcknowledgement() {
		return true;
	}

	@Override
	public BigDecimal getQuantityToApplyAtSource(BigDecimal quantity) {
		return quantity.negate();
	}

	@Override
	public void onPending(final StockOperation operation) {
		// Dispatched straight from draft; a submitted operation waits for onDispatched.
		if (StockOperationStatus.DISPATCHED.equals(operation.getStatus())) {
			takeStockFromSource(operation);
		}
	}

	@Override
	public void onDispatched(final StockOperation operation) {
		takeStockFromSource(operation);
	}

	@Override
	public void onCancelled(final StockOperation operation) {
		if (operation.getReservedTransactions() == null) {
			return;
		}
		if (operation.hasStockOutstandingFrom(operation.getSource())) {
			// Put back what left the source.
			executeCopyReservedAndClear(operation, (reserved, tx) -> tx.setParty(operation.getSource()));
		} else {
			clearReservedTransactions(operation);
		}
	}

	@Override
	public void onCompleted(final StockOperation operation) {
		// Received: add what arrived to the destination.
		executeCopyReservedAndClear(operation, (reserved, tx) -> {
			tx.setQuantity(reserved.getStockOperationItem().getQuantityReceived());
			tx.setStockItemPackagingUOM(reserved.getStockOperationItem().getQuantityReceivedPackagingUOM());
			tx.setParty(operation.getDestination());
		});
	}

	private void takeStockFromSource(final StockOperation operation) {
		if (operation.getReservedTransactions() == null || operation.hasStockOutstandingFrom(operation.getSource())) {
			return;
		}
		executeCopyReserved(operation, (reserved, tx) -> {
			tx.setParty(operation.getSource());
			tx.setQuantity(getQuantityToApplyAtSource(tx.getQuantity()));
		});
	}
}
