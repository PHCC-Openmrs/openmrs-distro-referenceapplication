package org.openmrs.module.labtestreport.extension.html;

import java.util.Collections;
import java.util.List;

import org.openmrs.module.web.extension.HeaderIncludeExt;

/**
 * Hides the unread alerts banner of the legacy UI pages. Notifications are stored as core alerts and
 * are read in the O3 notification bell; in the legacy header they only show up raw, markers and all.
 */
public class HideLegacyAlertsExt extends HeaderIncludeExt {

	@Override
	public List<String> getHeaderFiles() {
		return Collections.singletonList("/moduleResources/labtestreport/hideLegacyAlerts.css");
	}
}
