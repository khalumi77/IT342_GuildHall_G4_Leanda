package edu.cit.leanda.guildhall.guild

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.TextView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R

/**
 * JoinGuildDialog — mirrors the web BrowseGuilds join confirmation modal.
 * Shows guild name, description, member/quest counts, then Cancel / Join Guild.
 */
class JoinGuildDialog(
    context: Context,
    private val guild: BrowseGuildItem,
    private val onConfirm: () -> Unit
) : Dialog(context, R.style.Theme_GuildHall_Dialog) {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.dialog_join_guild)

        // Make the dialog window fill width with rounded corners
        window?.setLayout(
            android.view.WindowManager.LayoutParams.MATCH_PARENT,
            android.view.WindowManager.LayoutParams.WRAP_CONTENT
        )
        window?.setBackgroundDrawableResource(android.R.color.transparent)

        val tvGuildName    = findViewById<TextView>(R.id.tvGuildName)
        val tvDescription  = findViewById<TextView>(R.id.tvGuildDescription)
        val tvMemberCount  = findViewById<TextView>(R.id.tvMemberCount)
        val tvQuestCount   = findViewById<TextView>(R.id.tvQuestCount)
        val btnCancel      = findViewById<MaterialButton>(R.id.btnCancel)
        val btnJoin        = findViewById<MaterialButton>(R.id.btnJoin)

        tvGuildName.text   = guild.name
        tvMemberCount.text = "${guild.memberCount} members"
        tvQuestCount.text  = "${guild.questCount} active quests"

        if (guild.description.isBlank()) {
            tvDescription.visibility = View.GONE
        } else {
            tvDescription.text = guild.description
        }

        btnCancel.setOnClickListener { dismiss() }

        btnJoin.setOnClickListener {
            dismiss()
            onConfirm()
        }
    }
}