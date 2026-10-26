package org.openmrs.module.labtestreport.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.openmrs.module.labtestreport.DiseaseActivityRow.Kind;

/**
 * The rows of the Primary Health Activity Report, in the order and wording of the PHCC monthly paper
 * template. Diagnosis rows name the column(s) of disease_summary_diagnosis_map.csv whose diagnoses
 * they count (matched on the column header, ignoring case and extra spaces); a diagnosis listed under
 * more than one row only counts in the first, so Total Diseases never counts a visit twice.
 */
final class DiseaseActivityLayout {

	static final String GROUP_DISEASES = "Diseases";

	static final String TOTAL_DISEASES = "totalDiseases";

	static final List<RowDefinition> ROWS;

	static {
		List<RowDefinition> rows = new ArrayList<>();

		String section = "RESPIRATORY DISEASES";
		rows.add(diagnosis(section, "upperRespiratoryInfection", "1", "Acute (Upper) Respiratory infection")
		        .columns("Acute (Upper) Respiratory infection"));
		rows.add(diagnosis(section, "lowerRespiratoryInfection", "2",
		    "Acute (Lower) Respiratory infection (suspected Pneumonia)").columns("Acute (Lower) Respiratory infection"));
		rows.add(diagnosis(section, "suspectedTuberculosis", "3", "Suspected Tuberculosis")
		        .columns("Suspected Tuberculosis"));
		// The sheet has no column for this template row; its diagnoses sit under Lower RTI.
		rows.add(diagnosis(section, "acuteBacterialPneumonia", "4", "Acute bacterial pneumonia")
		        .pins("Acute bacterial pneumonia", "Bacterial pneumonia"));

		section = "WATER BORNE DISEASES";
		rows.add(diagnosis(section, "acuteDiarrhea", "1", "Acute Diarrhea").columns("Acute Diarrhea"));
		rows.add(diagnosis(section, "bloodyDiarrhea", "2", "Bloody Diarrhea").columns("Bloody Diarrhea"));
		rows.add(diagnosis(section, "acuteWateryDiarrhea", "3", "Acute Watery Diarrhea (Suspected Cholera)")
		        .columns("Acute Watery Diarrhea (Suspected Cholera)"));
		rows.add(diagnosis(section, "acuteJaundiceSyndrome", "4", "Acute Jaundice Syndrome")
		        .columns("Acute Jaundice Syndrome"));

		section = "VACCINE PREVENTABLE DISEASES";
		rows.add(diagnosis(section, "acuteFlaccidParalysis", "1", "Acute Flaccid Paralysis (AFP)")
		        .columns("Acute Flaccid Paralysis (AFP)"));
		rows.add(diagnosis(section, "suspectedMeasles", "2", "Suspected Measles").columns("Suspected Measles"));
		rows.add(diagnosis(section, "suspectedDiphtheria", "3", "Suspected Diphtheria").columns("Suspected Diptheria"));
		rows.add(diagnosis(section, "suspectedPertussis", "4", "Suspected Pertussis").columns("Suspected Pertussis"));
		rows.add(diagnosis(section, "suspectedNeonatalTetanus", "5", "Suspected Neonatal Tetanus")
		        .columns("Suspected Neonatal Tetanus"));
		rows.add(diagnosis(section, "suspectedMumps", "6", "Suspected Mumps").columns("Suspected Mumps"));

		section = "OTHER COMMUNICABLE DISEASES";
		rows.add(diagnosis(section, "unexplainedFever", "1", "Unexplained Fever / Fever of unknown origin")
		        .columns("Unexplained Fever/ Fever of unknown origin"));
		rows.add(diagnosis(section, "suspectedLeishmaniasis", "2", "Suspected Leishmaniasis")
		        .columns("Suspected Leishmaniasis (Report)"));
		rows.add(diagnosis(section, "suspectedHemorrhagicFever", "3", "Suspected Hemorrhagic Fever")
		        .columns("Suspected Hemorrhagic Fever"));
		rows.add(diagnosis(section, "suspectedMeningitis", "4", "Suspected Meningitis").columns("Suspected Meningitis"));
		// Row 5 on the template heads the four skin rows below it, so it's their subtotal rather than
		// a row of its own (and is left out of Total Diseases).
		rows.add(subtotal(section, "skinDiseases", "5", "Skin Diseases (scabies, chicken pox, lice, etc.)", "chickenPox",
		    "scabies", "liceInfestation", "otherSkinDisease"));
		rows.add(diagnosis(section, "chickenPox", "6", "Chicken pox").pins("Varicella", "Suspected Chickenpox",
		    "History of varicella"));
		rows.add(diagnosis(section, "scabies", "7", "Scabies").pins("Scabies"));
		rows.add(diagnosis(section, "liceInfestation", "8", "Lice infestation").columns("Lice Infestation"));
		// Whatever the sheet's combined "Skin Diseases" column lists beyond the pinned chicken pox and
		// scabies diagnoses (e.g. Ectoparasitic Skin Disease) counts here.
		rows.add(diagnosis(section, "otherSkinDisease", "9", "Other skin disease").columns("other skin disease",
		    "Skin Diseases (scabies, chicken pox, lice, etc.)"));
		rows.add(diagnosis(section, "sti", "10", "STI (Non HIV/AIDS)").columns("STI (Non HIV/AIDS)"));
		rows.add(diagnosis(section, "otherCommunicableDisease", "11", "Other Unusual Communicable Disease")
		        .columns("Other Unusual Communicable Disease Name"));

		section = "OTHER DISEASES - SPECIFIED";
		rows.add(diagnosis(section, "gastroIntestinal", "1", "Gastro-Intestinal Diseases (PUD, Helminthiasis, etc.)")
		        .columns("Gastro-Intestinal Diseases (PUD, Helminthiasis, etc.)"));
		rows.add(diagnosis(section, "musculoskeletal", "2", "Musculoskeletal Diseases").columns("Musculoskeletal Diseases"));
		rows.add(diagnosis(section, "genitoUrinary", "3", "Genito/Urinary Infection").columns("Genito/Urinary Infection"));
		rows.add(diagnosis(section, "obstetricGynaecological", "4", "Obstetric/Gynaecological diseases")
		        .columns("Obstetric/Gynaecological diseases"));
		rows.add(diagnosis(section, "injuriesV00X99", "5", "Injuries by external causes (ICD 10 V00 to X99)")
		        .columns("Injuries by external cuases (ICD 10 V00 to X99)"));
		// The sheet has no column for this template row; its diagnosis sits under the V00-X99 column, so
		// it's pinned here to take it from row 5.
		rows.add(diagnosis(section, "injuriesY36Y38", "6", "Injuries by external causes (ICD 10 Y36 - Y38)")
		        .pins("Injuries by external causes (ICD 10 Y36 - Y38)"));
		rows.add(diagnosis(section, "dental", "7", "Dental diseases (dental caries etc.)")
		        .columns("Dental diseases (dental caries etc.)"));
		rows.add(diagnosis(section, "ear", "8", "Ear diseases (otitis media etc.)")
		        .columns("Ear diseases (otitis media etc.)"));
		rows.add(diagnosis(section, "eye", "9", "Eye diseases (conjunctivitis etc.)")
		        .columns("Eye diseases (conjuctivitis etc.)"));
		rows.add(diagnosis(section, "anemia", "10", "Anemia").columns("Anemia"));
		rows.add(diagnosis(section, "bitesAndStings", "11", "Animal and Insect Bites/ Stings (snake, scorpion, dog etc.)")
		        .columns("Animal and Insect Bites/ Stings (snake, scorpion, dog etc.)"));
		rows.add(diagnosis(section, "acuteMalnutrition", "12", "Acute Malnutrition").columns("Acute Malnutrition"));
		rows.add(diagnosis(section, "otherDiseases", "13", "Others").columns("OTHER DISEASES- SPECIFIED"));

		section = "NON COMMUNICABLE DISEASES";
		rows.add(diagnosis(section, "neurological", "1", "Neurological Diseases (convulsions, headache, stroke, etc.)")
		        .columns("Neurological Diseases (convulsions, headache, stroke, etc.)"));
		rows.add(diagnosis(section, "mentalPsychiatric", "2", "Mental/Psychiatric Diseases")
		        .columns("Mental/Psychiatric Diseases"));
		rows.add(diagnosis(section, "diabetes", "3", "Chronic Disease - Diabetes Mellitus")
		        .columns("Chronic Disease - Diabetes Mellitus"));
		rows.add(diagnosis(section, "hypertension", "4", "Chronic Disease - Hypertension")
		        .columns("Chronic Disease - Hypertension"));
		rows.add(diagnosis(section, "asthma", "5", "Chronic Disease - Asthma").columns("Chronic Disease - Asthma"));
		rows.add(diagnosis(section, "chronicOthers", "6", "Chronic Disease - Others").columns("Chronic Disease - Others"));

		List<String> diseaseRowKeys = new ArrayList<>();
		for (RowDefinition row : rows) {
			if (row.kind == Kind.DIAGNOSIS || row.kind == Kind.NOT_CAPTURED) {
				diseaseRowKeys.add(row.key);
			}
		}
		rows.add(total(GROUP_DISEASES, TOTAL_DISEASES, "Total Diseases", diseaseRowKeys));

		ROWS = Collections.unmodifiableList(rows);
	}

	private DiseaseActivityLayout() {
	}

	private static RowDefinition diagnosis(String section, String key, String number, String label) {
		return new RowDefinition(GROUP_DISEASES, section, key, number, label, Kind.DIAGNOSIS);
	}

	private static RowDefinition subtotal(String section, String key, String number, String label, String... memberKeys) {
		RowDefinition row = new RowDefinition(GROUP_DISEASES, section, key, number, label, Kind.SUBTOTAL);
		row.memberKeys.addAll(Arrays.asList(memberKeys));
		return row;
	}

	private static RowDefinition total(String group, String key, String label, List<String> memberKeys) {
		RowDefinition row = new RowDefinition(group, null, key, null, label, Kind.TOTAL);
		row.memberKeys.addAll(memberKeys);
		return row;
	}

	static final class RowDefinition {

		final String group;

		final String section;

		final String key;

		final String number;

		final String label;

		final Kind kind;

		/** Headers of the mapping sheet columns whose diagnoses (and the header itself, if it's a concept) count here. */
		final List<String> sourceColumns = new ArrayList<>();

		/** Diagnosis names that count here even when the sheet also lists them under an earlier row. */
		final List<String> pinnedNames = new ArrayList<>();

		/** For subtotal and total rows, the keys of the rows they add up. */
		final List<String> memberKeys = new ArrayList<>();

		private RowDefinition(String group, String section, String key, String number, String label, Kind kind) {
			this.group = group;
			this.section = section;
			this.key = key;
			this.number = number;
			this.label = label;
			this.kind = kind;
		}

		private RowDefinition columns(String... headers) {
			sourceColumns.addAll(Arrays.asList(headers));
			return this;
		}

		private RowDefinition pins(String... names) {
			pinnedNames.addAll(Arrays.asList(names));
			return this;
		}
	}
}
