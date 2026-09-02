-- AddForeignKey
ALTER TABLE "critical_incidents" ADD CONSTRAINT "critical_incidents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_kpis" ADD CONSTRAINT "employee_kpis_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_performances" ADD CONSTRAINT "project_performances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_reviews" ADD CONSTRAINT "monthly_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
