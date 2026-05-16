package edu.cit.leanda.guildhall.profile

import android.app.Dialog
import android.os.Bundle
import android.widget.GridLayout
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R

class EditSkillsDialog : DialogFragment() {
    interface Listener { fun onSkillsSaved(skills: List<String>) }
    private val allSkills = listOf("Design", "Academic", "Manual Labor", "Tutoring", "Media", "IT/Tech", "Writing", "Programming", "Research")
    private val selected = linkedSetOf<String>()

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        selected.addAll(requireArguments().getStringArray(ARG_SKILLS)?.toList() ?: emptyList())
        val view = layoutInflater.inflate(R.layout.dialog_edit_skills, null)
        val grid: GridLayout = view.findViewById(R.id.gridSkills)
        allSkills.forEach { skill ->
            grid.addView(MaterialButton(requireContext()).apply {
                text = skill
                isCheckable = true
                isChecked = selected.contains(skill)
                setOnClickListener { if (isChecked) selected.add(skill) else selected.remove(skill) }
            })
        }
        view.findViewById<MaterialButton>(R.id.btnCancel).setOnClickListener { dismiss() }
        view.findViewById<MaterialButton>(R.id.btnSave).setOnClickListener {
            (activity as? Listener)?.onSkillsSaved(selected.toList())
            dismiss()
        }
        return AlertDialog.Builder(requireContext()).setView(view).create()
    }

    companion object {
        private const val ARG_SKILLS = "skills"
        fun newInstance(skills: Array<String>) = EditSkillsDialog().apply {
            arguments = Bundle().apply { putStringArray(ARG_SKILLS, skills) }
        }
    }
}
