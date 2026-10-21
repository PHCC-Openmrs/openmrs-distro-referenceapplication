package org.openmrs.module.labtestreport.impl;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import org.openmrs.module.labtestreport.DiseaseActivityRow.Kind;
import org.openmrs.module.labtestreport.impl.DiseaseActivityLayout.RowDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Which report row each diagnosis concept counts under, worked out from the PHCC mapping sheet
 * (disease_summary_diagnosis_map.csv: one column per report row, headed by the row's name, listing
 * the diagnoses that roll up into it). Pinned names are claimed first, then every row's columns in
 * report order; a concept already claimed stays with its first row. Sheet names that match no concept,
 * or whose concept an earlier row already claimed, are logged for whoever maintains the sheet.
 */
final class DiseaseActivityMapping {

	static final String MAPPING_RESOURCE = "disease_summary_diagnosis_map.csv";

	private static final Logger log = LoggerFactory.getLogger(DiseaseActivityMapping.class);

	private final Map<Integer, String> rowKeyByConceptId;

	private final Map<String, List<String>> diagnosisNamesByRowKey;

	private DiseaseActivityMapping(Map<Integer, String> rowKeyByConceptId,
	    Map<String, List<String>> diagnosisNamesByRowKey) {
		this.rowKeyByConceptId = Collections.unmodifiableMap(rowKeyByConceptId);
		this.diagnosisNamesByRowKey = Collections.unmodifiableMap(diagnosisNamesByRowKey);
	}

	Map<Integer, String> getRowKeyByConceptId() {
		return rowKeyByConceptId;
	}

	/** @return the diagnoses counted under the row, one name per concept as the sheet spells it, sorted */
	List<String> getDiagnosisNames(String rowKey) {
		return diagnosisNamesByRowKey.getOrDefault(rowKey, Collections.emptyList());
	}

	/**
	 * @param resolver given normalized diagnosis names (see {@link #normalize}), returns the concept id
	 *            each one resolves to; names that match nothing are left out
	 */
	static DiseaseActivityMapping build(Function<Set<String>, Map<String, Integer>> resolver) {
		Map<String, List<String>> namesByColumn = readSheet();

		Set<String> allNames = new HashSet<>();
		for (Map.Entry<String, List<String>> column : namesByColumn.entrySet()) {
			allNames.add(column.getKey());
			for (String name : column.getValue()) {
				allNames.add(normalize(name));
			}
		}
		for (RowDefinition row : DiseaseActivityLayout.ROWS) {
			for (String name : row.pinnedNames) {
				allNames.add(normalize(name));
			}
		}
		Map<String, Integer> conceptIdByName = resolver.apply(allNames);

		Map<Integer, String> rowKeyByConceptId = new LinkedHashMap<>();
		Map<String, List<String>> diagnosisNamesByRowKey = new HashMap<>();
		Map<String, String> labelByRowKey = new HashMap<>();
		Set<Integer> pinnedConceptIds = new HashSet<>();
		Set<String> warned = new HashSet<>();

		for (RowDefinition row : DiseaseActivityLayout.ROWS) {
			labelByRowKey.put(row.key, row.label);
			for (String name : row.pinnedNames) {
				Integer conceptId = conceptIdByName.get(normalize(name));
				if (conceptId == null) {
					warnUnresolved(warned, name, row);
				} else if (!rowKeyByConceptId.containsKey(conceptId)) {
					rowKeyByConceptId.put(conceptId, row.key);
					diagnosisNamesByRowKey.computeIfAbsent(row.key, k -> new ArrayList<>()).add(name);
					pinnedConceptIds.add(conceptId);
				}
			}
		}

		Set<String> usedColumns = new HashSet<>();
		for (RowDefinition row : DiseaseActivityLayout.ROWS) {
			if (row.kind != Kind.DIAGNOSIS) {
				continue;
			}
			for (String header : row.sourceColumns) {
				String column = normalize(header);
				List<String> names = namesByColumn.get(column);
				if (names == null) {
					log.warn("Disease report mapping sheet has no column '{}' for row '{}'", header, row.label);
					continue;
				}
				usedColumns.add(column);
				// The header is usually a report label rather than a diagnosis, so it's only counted (and
				// never reported as unresolved) when it happens to be a concept name too.
				claim(row, header.trim(), conceptIdByName.get(column), false, rowKeyByConceptId, diagnosisNamesByRowKey,
				    labelByRowKey, pinnedConceptIds, warned);
				for (String name : names) {
					claim(row, name, conceptIdByName.get(normalize(name)), true, rowKeyByConceptId, diagnosisNamesByRowKey,
					    labelByRowKey, pinnedConceptIds, warned);
				}
			}
		}
		for (String column : namesByColumn.keySet()) {
			if (!usedColumns.contains(column)) {
				log.warn("Disease report mapping sheet column '{}' isn't used by any report row", column);
			}
		}
		for (List<String> diagnosisNames : diagnosisNamesByRowKey.values()) {
			diagnosisNames.sort(String.CASE_INSENSITIVE_ORDER);
		}
		return new DiseaseActivityMapping(rowKeyByConceptId, diagnosisNamesByRowKey);
	}

	private static void claim(RowDefinition row, String name, Integer conceptId, boolean reportUnresolved,
	        Map<Integer, String> rowKeyByConceptId, Map<String, List<String>> diagnosisNamesByRowKey,
	        Map<String, String> labelByRowKey, Set<Integer> pinnedConceptIds, Set<String> warned) {
		if (conceptId == null) {
			if (reportUnresolved) {
				warnUnresolved(warned, name, row);
			}
			return;
		}
		String claimedBy = rowKeyByConceptId.putIfAbsent(conceptId, row.key);
		if (claimedBy == null) {
			diagnosisNamesByRowKey.computeIfAbsent(row.key, k -> new ArrayList<>()).add(name);
		} else if (!claimedBy.equals(row.key) && !pinnedConceptIds.contains(conceptId)
		        && warned.add("DUPLICATE|" + normalize(name) + "|" + row.label)) {
			// A pinned diagnosis also listed in its sheet column is the intended override, not a sheet error.
			log.warn("Disease report mapping sheet lists '{}' under '{}', but it only counts under '{}'", name, row.label,
			    labelByRowKey.get(claimedBy));
		}
	}

	private static void warnUnresolved(Set<String> warned, String name, RowDefinition row) {
		if (warned.add("UNRESOLVED|" + normalize(name) + "|" + row.label)) {
			log.warn("Disease report mapping sheet name '{}' under '{}' matches no diagnosis concept", name, row.label);
		}
	}

	/** Trimmed, inner whitespace collapsed to single spaces, lower-cased: how sheet names and headers are matched. */
	static String normalize(String name) {
		return name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
	}

	/** @return the sheet's columns keyed by normalized header, each with its non-blank cells in order */
	private static Map<String, List<String>> readSheet() {
		List<List<String>> records;
		try (InputStream in = DiseaseActivityMapping.class.getClassLoader().getResourceAsStream(MAPPING_RESOURCE)) {
			if (in == null) {
				throw new IllegalStateException("Could not find classpath resource " + MAPPING_RESOURCE);
			}
			records = parseCsv(new String(in.readAllBytes(), StandardCharsets.UTF_8));
		}
		catch (IOException e) {
			throw new IllegalStateException("Failed to load " + MAPPING_RESOURCE, e);
		}
		Map<String, List<String>> namesByColumn = new LinkedHashMap<>();
		if (records.isEmpty()) {
			return namesByColumn;
		}
		List<String> headers = records.get(0);
		for (int i = 0; i < headers.size(); i++) {
			String header = headers.get(i).replace("﻿", "");
			if (header.trim().isEmpty()) {
				continue;
			}
			Set<String> names = new LinkedHashSet<>();
			for (List<String> record : records.subList(1, records.size())) {
				if (i < record.size() && !record.get(i).trim().isEmpty()) {
					names.add(record.get(i).trim());
				}
			}
			namesByColumn.computeIfAbsent(normalize(header), k -> new ArrayList<>()).addAll(names);
		}
		return namesByColumn;
	}

	/** Minimal RFC 4180 reader: comma separated, double-quoted fields may hold commas, quotes ("") and newlines. */
	static List<List<String>> parseCsv(String text) {
		List<List<String>> records = new ArrayList<>();
		List<String> record = new ArrayList<>();
		StringBuilder field = new StringBuilder();
		boolean quoted = false;
		for (int i = 0; i < text.length(); i++) {
			char c = text.charAt(i);
			if (quoted) {
				if (c == '"' && i + 1 < text.length() && text.charAt(i + 1) == '"') {
					field.append('"');
					i++;
				} else if (c == '"') {
					quoted = false;
				} else {
					field.append(c);
				}
			} else if (c == '"') {
				quoted = true;
			} else if (c == ',') {
				record.add(field.toString());
				field.setLength(0);
			} else if (c == '\n' || c == '\r') {
				if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
					i++;
				}
				record.add(field.toString());
				field.setLength(0);
				records.add(record);
				record = new ArrayList<>();
			} else {
				field.append(c);
			}
		}
		if (field.length() > 0 || !record.isEmpty()) {
			record.add(field.toString());
			records.add(record);
		}
		return records;
	}
}
