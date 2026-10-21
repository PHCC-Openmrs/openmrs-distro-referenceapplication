package org.openmrs.module.labtestreport;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One line of the disease surveillance summary report in the Primary Health Activity layout: a
 * numbered report row (e.g. "Acute Diarrhea") that rolls up many diagnosis concepts, or a subtotal /
 * total line, with its age-group/gender breakdown. Rows printed on the paper template that nothing in
 * the system records yet come back as {@link Kind#NOT_CAPTURED} so the UI can show them as
 * unavailable rather than as a misleading zero.
 */
public class DiseaseActivityRow {

	public enum Kind {
		DIAGNOSIS, SUBTOTAL, NOT_CAPTURED, TOTAL
	}

	private String group;

	private String section;

	private String rowKey;

	private String number;

	private String label;

	private Kind kind;

	private final Map<String, Long> counts = new LinkedHashMap<>();

	private long total;

	/** The diagnoses counted under this row (a subtotal lists its member rows' diagnoses), sorted by name. */
	private final List<String> diagnoses = new ArrayList<>();

	public String getGroup() {
		return group;
	}

	public void setGroup(String group) {
		this.group = group;
	}

	public String getSection() {
		return section;
	}

	public void setSection(String section) {
		this.section = section;
	}

	public String getRowKey() {
		return rowKey;
	}

	public void setRowKey(String rowKey) {
		this.rowKey = rowKey;
	}

	public String getNumber() {
		return number;
	}

	public void setNumber(String number) {
		this.number = number;
	}

	public String getLabel() {
		return label;
	}

	public void setLabel(String label) {
		this.label = label;
	}

	public Kind getKind() {
		return kind;
	}

	public void setKind(Kind kind) {
		this.kind = kind;
	}

	public Map<String, Long> getCounts() {
		return counts;
	}

	public long getTotal() {
		return total;
	}

	public void setTotal(long total) {
		this.total = total;
	}

	public List<String> getDiagnoses() {
		return diagnoses;
	}
}
