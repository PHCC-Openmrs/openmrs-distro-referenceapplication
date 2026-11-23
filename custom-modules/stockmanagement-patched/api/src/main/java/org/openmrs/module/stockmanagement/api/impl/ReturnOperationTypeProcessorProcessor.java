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

import org.openmrs.module.stockmanagement.api.model.StockOperationType;

/**
 * A Return sends stock back from a location to where it came from. The stock leaves the location
 * when the return is dispatched, not when it is submitted - see
 * {@link DispatchedOperationTypeProcessorBase}.
 */
public class ReturnOperationTypeProcessorProcessor extends DispatchedOperationTypeProcessorBase {
	
	public ReturnOperationTypeProcessorProcessor(StockOperationType stockOperationType) {
		super(stockOperationType);
	}
}
