package org.openmrs.module.labtestreport.web.controller;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.openmrs.api.context.Context;
import org.openmrs.module.labtestreport.NutritionReportService;
import org.openmrs.module.labtestreport.NutritionSummaryRow;
import org.openmrs.module.labtestreport.web.NutritionReportRow;
import org.springframework.beans.propertyeditors.CustomDateEditor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.ServletRequestDataBinder;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

/**
 * Renders the Nutrition Report - Child Under 5: one row per beneficiary currently under 5, with
 * their most recent visit's data, Current MUAC and Last MUAC. Clicking a row goes to that
 * beneficiary's O3 chart.
 */
@Controller
@RequestMapping("/module/labtestreport/nutritionChildUnder5.form")
public class ChildUnder5ReportController {

	@InitBinder
	public void initBinder(HttpServletRequest request, ServletRequestDataBinder binder) {
		binder.registerCustomEditor(Date.class,
		    new CustomDateEditor(new SimpleDateFormat(SummaryReportController.DATE_FORMAT), true));
	}

	@RequestMapping(method = RequestMethod.GET)
	public ModelAndView showReport(@RequestParam(value = "startDate", required = false) Date startDate,
	        @RequestParam(value = "endDate", required = false) Date endDate) {
		List<NutritionSummaryRow> summaryRows = Context.getService(NutritionReportService.class)
		        .getSummaryReport(startDate, endDate, true);

		SimpleDateFormat dateFormat = new SimpleDateFormat(SummaryReportController.DATE_FORMAT);
		List<NutritionReportRow> rows = new ArrayList<>();
		for (NutritionSummaryRow r : summaryRows) {
			String name = (r.getGivenName() + " " + r.getFamilyName()).trim();
			String visitDate = r.getVisitDate() == null ? "" : dateFormat.format(r.getVisitDate());
			rows.add(new NutritionReportRow(r.getPatientUuid(), name, r.getCategory(), r.getAge(), r.getLocation(),
			        visitDate, r.getVisitCount(), r.getCurrentMuac(), r.getLastMuac(), r.getDiagnosis(),
			        r.getTypeOfSupplement(), r.getSupplementQuantity(), r.getNationalId(), r.getPhoneNumber(),
			        r.getProject()));
		}

		ModelMap model = new ModelMap();
		model.addAttribute("rows", rows);
		model.addAttribute("startDate", startDate == null ? "" : dateFormat.format(startDate));
		model.addAttribute("endDate", endDate == null ? "" : dateFormat.format(endDate));
		return new ModelAndView("/module/labtestreport/nutritionChildUnder5Report", model);
	}
}
