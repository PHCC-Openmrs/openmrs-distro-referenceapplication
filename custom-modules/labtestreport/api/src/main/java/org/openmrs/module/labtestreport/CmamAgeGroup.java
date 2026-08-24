package org.openmrs.module.labtestreport;

/**
 * The CMAM Follow-up form is used for both young children and older patients, so its summary and
 * drill-down are split by the patient's age (in whole years) at their most recent CMAM encounter -
 * otherwise the two populations would be averaged together under a single count.
 */
public enum CmamAgeGroup {
	UNDER_5,
	ABOVE_5
}
