package org.openmrs.module.labtestreport.web.controller;

import org.openmrs.api.context.Context;
import org.openmrs.module.labtestreport.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Marks notifications read. Lives under /ws/rest/v1 rather than /module/labtestreport/api because
 * core's CSRFGuard rejects every POST outside /ws/* that carries no CSRF token, which the O3
 * frontend never sends; the unread list itself stays a GET in {@link LabTestReportRestController}.
 */
@Controller
@RequestMapping("/rest/v1/labtestreport/notifications")
public class NotificationRestController {

	@RequestMapping(value = "/{notificationId}/read", method = RequestMethod.POST)
	@ResponseBody
	public ResponseEntity<String> markNotificationRead(@PathVariable("notificationId") Integer notificationId) {
		if (!Context.isAuthenticated()) {
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		Context.getService(NotificationService.class).markRead(notificationId);
		return new ResponseEntity<>(HttpStatus.NO_CONTENT);
	}

	@RequestMapping(value = "/readAll", method = RequestMethod.POST)
	@ResponseBody
	public ResponseEntity<String> markAllNotificationsRead() {
		if (!Context.isAuthenticated()) {
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		Context.getService(NotificationService.class).markAllRead();
		return new ResponseEntity<>(HttpStatus.NO_CONTENT);
	}
}
