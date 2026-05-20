package edu.cit.leanda.guildhall.profile

import android.app.Dialog
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R

class EditSkillsDialog : DialogFragment() {

    interface Listener { fun onSkillsSaved(skills: List<String>) }

    private val allSkills = listOf(
        "Design"       to "🎨",
        "Academic"     to "📚",
        "Manual Labor" to "💪",
        "Tutoring"     to "🎓",
        "Media"        to "🎤",
        "IT/Tech"      to "💻",
        "Writing"      to "✍️",
        "Caregiving"   to "🤝"
    )

    private val selected = linkedSetOf<String>()

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        selected.addAll(requireArguments().getStringArray(ARG_SKILLS)?.toList() ?: emptyList())

        // Root container
        val root = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 32)
        }

        // Title
        root.addView(TextView(requireContext()).apply {
            text = "Edit Skills"
            textSize = 20f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(android.graphics.Color.parseColor("#1A1A1A"))
            setPadding(0, 0, 0, 24)
        })

        // Subtitle
        root.addView(TextView(requireContext()).apply {
            text = "Select all skills you feel confident in:"
            textSize = 13f
            setTextColor(android.graphics.Color.parseColor("#666666"))
            setPadding(0, 0, 0, 24)
        })

        // Build 2-column grid manually using nested LinearLayouts
        // This avoids GridLayout measurement issues that cause cutoff
        val skillButtons = mutableMapOf<String, MaterialButton>()

        val rows = allSkills.chunked(2)
        for (rowItems in rows) {
            val rowLayout = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.bottomMargin = 12 }
            }

            for ((skill, emoji) in rowItems) {
                val btn = MaterialButton(requireContext(), null,
                    com.google.android.material.R.attr.materialButtonOutlinedStyle
                ).apply {
                    text = "$emoji  $skill"
                    textSize = 13f
                    isCheckable = true
                    isChecked = selected.contains(skill)
                    setPadding(16, 20, 16, 20)
                    gravity = Gravity.CENTER
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    ).also {
                        it.marginEnd = if (rowItems.indexOf(skill to emoji) == 0) 8 else 0
                    }
                    applyChipStyle(this, selected.contains(skill))
                    setOnClickListener {
                        val nowSelected = !selected.contains(skill)
                        if (nowSelected) selected.add(skill) else selected.remove(skill)
                        applyChipStyle(this, nowSelected)
                    }
                }
                skillButtons[skill] = btn
                rowLayout.addView(btn)
            }

            // If odd number of skills in row, add empty spacer
            if (rowItems.size == 1) {
                rowLayout.addView(View(requireContext()).apply {
                    layoutParams = LinearLayout.LayoutParams(0, 1, 1f)
                })
            }

            root.addView(rowLayout)
        }

        // Action buttons row
        val actionRow = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = 24 }
        }

        val btnCancel = MaterialButton(
            requireContext(), null,
            com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            text = "Cancel"
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.marginEnd = 12 }
            setOnClickListener { dismiss() }
        }

        val btnSave = MaterialButton(requireContext()).apply {
            text = "Save"
            setBackgroundColor(android.graphics.Color.parseColor("#34C759"))
            setTextColor(android.graphics.Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                (activity as? Listener)?.onSkillsSaved(selected.toList())
                dismiss()
            }
        }

        actionRow.addView(btnCancel)
        actionRow.addView(btnSave)
        root.addView(actionRow)

        // Wrap in ScrollView so it never clips on small screens
        val scrollView = ScrollView(requireContext()).apply {
            addView(root)
        }

        return AlertDialog.Builder(requireContext())
            .setView(scrollView)
            .create()
            .also { dialog ->
                // Make dialog wide
                dialog.setOnShowListener {
                    dialog.window?.setLayout(
                        (resources.displayMetrics.widthPixels * 0.92).toInt(),
                        android.view.WindowManager.LayoutParams.WRAP_CONTENT
                    )
                }
            }
    }

    private fun applyChipStyle(btn: MaterialButton, isSelected: Boolean) {
        if (isSelected) {
            btn.setBackgroundColor(android.graphics.Color.parseColor("#F0FFF4"))
            btn.strokeColor = android.content.res.ColorStateList.valueOf(
                android.graphics.Color.parseColor("#34C759")
            )
            btn.strokeWidth = 4
            btn.setTextColor(android.graphics.Color.parseColor("#166534"))
        } else {
            btn.setBackgroundColor(android.graphics.Color.WHITE)
            btn.strokeColor = android.content.res.ColorStateList.valueOf(
                android.graphics.Color.parseColor("#DDDDDD")
            )
            btn.strokeWidth = 2
            btn.setTextColor(android.graphics.Color.parseColor("#333333"))
        }
    }

    companion object {
        private const val ARG_SKILLS = "skills"
        fun newInstance(skills: Array<String>) = EditSkillsDialog().apply {
            arguments = Bundle().apply { putStringArray(ARG_SKILLS, skills) }
        }
    }
}