
import { supabase } from '../config/supabase.js'

import { getStudentById } from '../services/studentManagementService.js'

export async function getStudentDashboard(req, res) {
  try {
    // Always derive the student identity from the verified session.
    const profileId = req.user.id

    const { data: studentDetails, error } = await supabase
      .from('student_details')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!studentDetails) {
      return res.status(404).json({
        success: false,
        message: 'Student information has not been set up yet.',
      })
    }

    const student = await getStudentById(studentDetails.id)

    if (!student || student.profile_id !== profileId) {
      return res.status(404).json({
        success: false,
        message: 'Student information could not be found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Student dashboard information retrieved successfully.',
      data: {
        student,
      },
    })
  } catch (error) {
    console.error('Student dashboard error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to load student dashboard information.',
    })
  }
}
