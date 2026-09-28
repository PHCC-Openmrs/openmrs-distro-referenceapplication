package org.openmrs.module.labtestreport;

import org.openmrs.event.Event;
import org.openmrs.module.BaseModuleActivator;
import org.openmrs.module.DaemonToken;
import org.openmrs.module.DaemonTokenAware;
import org.openmrs.module.labtestreport.notification.NotificationEventListener;
import org.openmrs.module.labtestreport.report.ChildAbove5ReportManager;
import org.openmrs.module.labtestreport.report.ChildUnder5ReportManager;
import org.openmrs.module.labtestreport.report.CmamAbove5FollowUpReportManager;
import org.openmrs.module.labtestreport.report.CmamFollowUpReportManager;
import org.openmrs.module.labtestreport.report.DiseaseSummaryReportManager;
import org.openmrs.module.labtestreport.report.LabTestSummaryReportManager;
import org.openmrs.module.labtestreport.report.PatientEncounterSummaryReportManager;
import org.openmrs.module.labtestreport.report.StockLedgerReportManager;
import org.openmrs.module.reporting.report.manager.ReportManagerUtil;

/**
 * Registers this module's reports with the Reporting module on startup, and subscribes the
 * notification bell's listener to the entity events it reports on.
 */
public class LabTestReportActivator extends BaseModuleActivator implements DaemonTokenAware {

	private static DaemonToken daemonToken;

	private static NotificationEventListener notificationEventListener;

	@Override
	public void setDaemonToken(DaemonToken token) {
		daemonToken = token;
	}

	@Override
	public void started() {
		ReportManagerUtil.setupReport(new LabTestSummaryReportManager());
		ReportManagerUtil.setupReport(new CmamFollowUpReportManager());
		ReportManagerUtil.setupReport(new CmamAbove5FollowUpReportManager());
		ReportManagerUtil.setupReport(new PatientEncounterSummaryReportManager());
		ReportManagerUtil.setupReport(new DiseaseSummaryReportManager());
		ReportManagerUtil.setupReport(new StockLedgerReportManager());
		ReportManagerUtil.setupReport(new ChildUnder5ReportManager());
		ReportManagerUtil.setupReport(new ChildAbove5ReportManager());

		notificationEventListener = new NotificationEventListener(daemonToken);
		for (String topic : NotificationEventListener.TOPICS) {
			Event.subscribe(topic, notificationEventListener);
		}
	}

	@Override
	public void stopped() {
		if (notificationEventListener != null) {
			for (String topic : NotificationEventListener.TOPICS) {
				Event.unsubscribe(topic, notificationEventListener);
			}
			notificationEventListener = null;
		}
	}
}
