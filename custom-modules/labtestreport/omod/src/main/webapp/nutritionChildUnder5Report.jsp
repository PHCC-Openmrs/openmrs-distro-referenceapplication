<%@ include file="/WEB-INF/template/include.jsp"%>

<%@ include file="/WEB-INF/template/header.jsp"%>

<h2><spring:message code="labtestreport.nutritionUnder5.title" /></h2>

<style>
	#nutritionSummaryTable { border-collapse: collapse; width: 100%; }
	#nutritionSummaryTable th, #nutritionSummaryTable td { border: 1px solid #ccc; padding: 4px 8px; }
	#nutritionSummaryTable th { background-color: #f0f0f0; text-align: left; }
	#nutritionSummaryTable tbody tr { cursor: pointer; }
	#nutritionSummaryTable tbody tr:hover { background-color: #eef6fb; }
</style>

<form method="get" action="${pageContext.request.contextPath}/module/labtestreport/nutritionChildUnder5.form">
	<label for="startDate"><spring:message code="labtestreport.startDate" /></label>
	<input type="date" id="startDate" name="startDate" value="${startDate}" />
	<label for="endDate"><spring:message code="labtestreport.endDate" /></label>
	<input type="date" id="endDate" name="endDate" value="${endDate}" />
	<input type="submit" value="<spring:message code='labtestreport.filter'/>" />
</form>

<br />

<table id="nutritionSummaryTable">
	<thead>
		<tr>
			<th><spring:message code="labtestreport.patientEncounters.name" /></th>
			<th><spring:message code="labtestreport.nutrition.category" /></th>
			<th><spring:message code="labtestreport.patientEncounters.age" /></th>
			<th><spring:message code="labtestreport.nutrition.location" /></th>
			<th><spring:message code="labtestreport.nutrition.visitDate" /></th>
			<th><spring:message code="labtestreport.nutrition.visitCount" /></th>
			<th><spring:message code="labtestreport.nutrition.currentMuac" /></th>
			<th><spring:message code="labtestreport.nutrition.lastMuac" /></th>
			<th><spring:message code="labtestreport.nutrition.diagnosis" /></th>
			<th><spring:message code="labtestreport.nutrition.typeOfSupplement" /></th>
			<th><spring:message code="labtestreport.nutrition.supplementQuantity" /></th>
			<th><spring:message code="labtestreport.drilldown.nationalId" /></th>
			<th><spring:message code="labtestreport.drilldown.phoneNumber" /></th>
			<th><spring:message code="labtestreport.nutrition.project" /></th>
		</tr>
	</thead>
	<tbody>
		<c:forEach items="${rows}" var="row" varStatus="rowStatus">
			<c:url value="/spa/patient/${row.patientUuid}/chart" var="chartUrl" />
			<tr class="${rowStatus.index % 2 == 0 ? 'evenRow' : 'oddRow'}" onclick="window.location.href='${chartUrl}'">
				<td><a href="${chartUrl}">${row.name}</a></td>
				<td>${row.category}</td>
				<td>${row.age}</td>
				<td>${row.location}</td>
				<td>${row.visitDate}</td>
				<td>${row.visitCount}</td>
				<td>${row.currentMuac}</td>
				<td>${row.lastMuac}</td>
				<td>${row.diagnosis}</td>
				<td>${row.typeOfSupplement}</td>
				<td>${row.supplementQuantity}</td>
				<td>${row.nationalId}</td>
				<td>${row.phoneNumber}</td>
				<td>${row.project}</td>
			</tr>
		</c:forEach>
		<c:if test="${empty rows}">
			<tr><td colspan="14"><spring:message code="labtestreport.drilldown.noPatients" /></td></tr>
		</c:if>
	</tbody>
</table>

<%@ include file="/WEB-INF/template/footer.jsp"%>
