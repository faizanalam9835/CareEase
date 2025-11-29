// Email templates for appointment notifications
const appointmentEmailTemplates = {
    // Patient ko confirmation email
    patientAppointmentConfirmation: (appointment, patient, doctor) => {
      return {
        subject: `Appointment Confirmed - ${appointment.appointmentId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Appointment Confirmed! 🎉</h2>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-bottom: 15px;">Appointment Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>Appointment ID:</strong></td>
                  <td style="padding: 8px 0;">${appointment.appointmentId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;"><strong>Doctor:</strong></td>
                  <td style="padding: 8px 0;">Dr. ${doctor.firstName} ${doctor.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;"><strong>Department:</strong></td>
                  <td style="padding: 8px 0;">${appointment.department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0;">${new Date(appointment.appointmentDate).toDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;"><strong>Time:</strong></td>
                  <td style="padding: 8px 0;">${appointment.appointmentTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;"><strong>Type:</strong></td>
                  <td style="padding: 8px 0;">${appointment.appointmentType}</td>
                </tr>
              </table>
            </div>
  
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin: 0;">📋 Important Instructions:</h4>
              <ul style="color: #92400e; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Arrive 15 minutes before your appointment time</li>
                <li>Bring your previous medical reports (if any)</li>
                <li>Carry a valid ID proof</li>
                <li>Mention your Appointment ID at reception</li>
              </ul>
            </div>
  
            <p style="color: #475569; margin-top: 20px;">
              For any queries or rescheduling, please contact hospital reception.
            </p>
  
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px;">
                Best regards,<br>
                <strong>${patient.tenantId} Hospital</strong>
              </p>
            </div>
          </div>
        `
      };
    },
  
    // Doctor ko notification email
    doctorAppointmentNotification: (appointment, patient, doctor) => {
      return {
        subject: `New Appointment - ${appointment.appointmentId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">New Appointment Scheduled 🩺</h2>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-bottom: 15px;">Appointment Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #047857; width: 120px;"><strong>Appointment ID:</strong></td>
                  <td style="padding: 8px 0;">${appointment.appointmentId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #047857;"><strong>Patient:</strong></td>
                  <td style="padding: 8px 0;">${patient.firstName} ${patient.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #047857;"><strong>Patient ID:</strong></td>
                  <td style="padding: 8px 0;">${patient.patientId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #047857;"><strong>Phone:</strong></td>
                  <td style="padding: 8px 0;">${patient.phone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #047857;"><strong>Date & Time:</strong></td>
                  <td style="padding: 8px 0;">${new Date(appointment.appointmentDate).toDateString()} at ${appointment.appointmentTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #047857;"><strong>Reason:</strong></td>
                  <td style="padding: 8px 0;">${appointment.reason}</td>
                </tr>
                ${appointment.symptoms && appointment.symptoms.length > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #047857;"><strong>Symptoms:</strong></td>
                    <td style="padding: 8px 0;">${appointment.symptoms.join(', ')}</td>
                  </tr>
                ` : ''}
              </table>
            </div>
  
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px;">
              <h4 style="color: #1e40af; margin: 0;">📝 Patient Information:</h4>
              <p style="color: #374151; margin: 10px 0 0 0;">
                Please review patient details before the appointment. All medical history and previous prescriptions 
                will be available in the patient's EHR profile.
              </p>
            </div>
  
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px;">
                Regards,<br>
                <strong>Hospital Management System</strong>
              </p>
            </div>
          </div>
        `
      };
    }
  };
  
  module.exports = appointmentEmailTemplates;