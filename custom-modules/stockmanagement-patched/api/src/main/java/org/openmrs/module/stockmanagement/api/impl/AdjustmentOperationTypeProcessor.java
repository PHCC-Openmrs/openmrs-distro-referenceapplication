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

import org.openmrs.module.stockmanagement.api.utils.Action2;
import org.openmrs.module.stockmanagement.api.model.ReservedTransaction;
import org.openmrs.module.stockmanagement.api.model.StockItemTransaction;
import org.openmrs.module.stockmanagement.api.model.StockOperation;
import org.openmrs.module.stockmanagement.api.model.StockOperationType;

import java.math.BigDecimal;

/**
 * Model class that represents an adjustment stock operation type. Adjustment operations directly
 * alter the item stock for a given stockroom and are used to correct item stock mistakes.
 */
public class AdjustmentOperationTypeProcessor extends StockOperationTypeProcessorBase {
	
	public AdjustmentOperationTypeProcessor(StockOperationType stockOperationType) {
		super(stockOperationType);
	}
	
	@Override
	public boolean requiresReason() {
		return true;
	}
	
	/**
	 * Specifies whether the quantity should be negated when it is applied. This allows sub-classes
	 * to change the default adjustment behavior.
	 * 
	 * @return
	 */
	protected boolean negateAppliedQuantity() {
		// Note that the quantity is NOT negated because the adjustment quantity
		// is the difference
		return false;
	}
	
	@Override
	public boolean isNegativeItemQuantityAllowed() {
		return true;
	}
	
	@Override
	public boolean shouldVerifyNegativeStockAmountsAtSource() {
		return true;
	}
	
	@Override
	public BigDecimal getQuantityToApplyAtSource(BigDecimal quantity) {
		if (negateAppliedQuantity()) {
			return quantity.multiply(BigDecimal.valueOf(-1));
		}
		return quantity;
	}
	
	@Override
	public boolean appliesStockAtCompletion() {
		return true;
	}

	@Override
	public void onPending(final StockOperation operation) {
		// Item stock is left untouched until the operation is approved/completed.
	}

	@Override
	public void onCancelled(final StockOperation operation) {
		// Nothing was applied while the operation was pending, so there is nothing to reverse.
		clearReservedTransactions(operation);
	}

	@Override
	public void onCompleted(final StockOperation operation) {
		executeCopyReservedAndClear(operation, new Action2<ReservedTransaction, StockItemTransaction>() {

			@Override
			public void apply(ReservedTransaction reserved, StockItemTransaction tx) {
				tx.setParty(operation.getSource());
				if (negateAppliedQuantity()) {
					tx.setQuantity(getQuantityToApplyAtSource(tx.getQuantity()));
				}
			}
		});
	}
}
