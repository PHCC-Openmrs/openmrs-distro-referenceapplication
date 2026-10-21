package org.openmrs.module.labtestreport;

import java.util.ArrayList;
import java.util.List;

/**
 * The disease surveillance summary report in the Primary Health Activity layout.
 */
public class DiseaseActivityReport {

	private final List<DiseaseActivityRow> rows = new ArrayList<>();

	public List<DiseaseActivityRow> getRows() {
		return rows;
	}
}
