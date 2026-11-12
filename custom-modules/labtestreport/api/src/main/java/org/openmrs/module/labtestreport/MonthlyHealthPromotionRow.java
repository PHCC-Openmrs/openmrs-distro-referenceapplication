package org.openmrs.module.labtestreport;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One row of the Monthly Health Promotion Report. A row is either a session-type row
 * ({@link #subject} is null: Individual Sessions, Group Sessions, Follow up cases), a session
 * subject row beneath one of those, or the Grand Total, with its age-group/gender breakdown.
 */
public class MonthlyHealthPromotionRow {

	private String sessionTypeKey;

	private String sessionType;

	/** The Topic recorded on the form, or null for a session-type or grand-total row. */
	private String subject;

	private final Map<String, Long> counts = new LinkedHashMap<>();

	private long total;

	public String getSessionTypeKey() {
		return sessionTypeKey;
	}

	public void setSessionTypeKey(String sessionTypeKey) {
		this.sessionTypeKey = sessionTypeKey;
	}

	public String getSessionType() {
		return sessionType;
	}

	public void setSessionType(String sessionType) {
		this.sessionType = sessionType;
	}

	public String getSubject() {
		return subject;
	}

	public void setSubject(String subject) {
		this.subject = subject;
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
