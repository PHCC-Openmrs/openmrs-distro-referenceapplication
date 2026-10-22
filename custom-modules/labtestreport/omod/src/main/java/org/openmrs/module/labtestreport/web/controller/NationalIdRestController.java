package org.openmrs.module.labtestreport.web.controller;

import org.apache.commons.lang3.StringUtils;
import org.openmrs.api.context.Context;
import org.openmrs.module.labtestreport.NationalIdService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Duplicate check for the registration form's National ID field: answers just {@code true} or
 * {@code false}, from an exact indexed lookup rather than the loose patient search.
 */
@Controller
@RequestMapping("/rest/v1/labtestreport/nationalid")
public class NationalIdRestController {

	@RequestMapping(value = "/inuse", method = RequestMethod.GET)
	@ResponseBody
	public ResponseEntity<String> isNationalIdInUse(@RequestParam(value = "nationalId", required = false) String nationalId,
	        @RequestParam(value = "excludePatient", required = false) String excludePatientUuid) {
		if (!Context.isAuthenticated()) {
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		if (StringUtils.isBlank(nationalId)) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		boolean inUse = Context.getService(NationalIdService.class).isNationalIdInUse(nationalId, excludePatientUuid);
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		return new ResponseEntity<>(String.valueOf(inUse), headers, HttpStatus.OK);
	}
}
