package org.openmrs.module.labtestreport;

/**
 * A stock operation's externalReference (varchar(50)) is the only free-text slot it has - the
 * stock management UI packs Purchase Order No, Purchase Request No, and Project Fund Code into
 * it with short prefixes ("PO:", "PR:", "FC:") separated by "|" (see external-reference.utils.ts
 * on the frontend) rather than losing the distinction between the three. This splits them back
 * apart, mirroring that packing format exactly.
 */
public final class ExternalReferenceParser {

	private static final String PURCHASE_ORDER_PREFIX = "PO:";

	private static final String PURCHASE_REQUEST_PREFIX = "PR:";

	private static final String PROJECT_FUND_CODE_PREFIX = "FC:";

	private static final String SEPARATOR = "\\|";

	private ExternalReferenceParser() {
	}

	private static String part(String externalReference, String prefix) {
		if (externalReference == null) {
			return "";
		}
		for (String piece : externalReference.split(SEPARATOR)) {
			if (piece.startsWith(prefix)) {
				return piece.substring(prefix.length());
			}
		}
		return "";
	}

	public static String getPurchaseOrderNo(String externalReference) {
		return part(externalReference, PURCHASE_ORDER_PREFIX);
	}

	public static String getPurchaseRequestNo(String externalReference) {
		return part(externalReference, PURCHASE_REQUEST_PREFIX);
	}

	public static String getProjectFundCode(String externalReference) {
		return part(externalReference, PROJECT_FUND_CODE_PREFIX);
	}
}
