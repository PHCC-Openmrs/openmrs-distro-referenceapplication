package org.openmrs.module.labtestreport;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One row of the Reproductive Health Activity Report: a single indicator (e.g. "Second antenatal
 * visit") within its section, with its age-group/gender breakdown. {@link #captured} is false for
 * rows printed on the paper form that nothing in the system records yet, so the UI can show them
 * as not available rather than as a misleading zero.
 */
public class RhActivityReportRow {

	private String section;

	private String indicatorKey;

	private String label;

	private boolean captured = true;

	private final Map<String, Long> counts = new LinkedHashMap<>();

	private long total;

	public String getSection() {
		return section;
	}

	public void setSection(String section) {
		this.section = section;
	}

	public String getIndicatorKey() {
		return indicatorKey;
	}

	public void setIndicatorKey(String indicatorKey) {
		this.indicatorKey = indicatorKey;
	}

	public String getLabel() {
		return label;
	}

	public void setLabel(String label) {
		this.label = label;
	}

	public boolean isCaptured() {
		return captured;
	}

	public void setCaptured(boolean captured) {
		this.captured = captured;
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
}
