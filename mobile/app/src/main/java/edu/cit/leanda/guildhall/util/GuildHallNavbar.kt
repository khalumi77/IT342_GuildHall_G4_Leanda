package edu.cit.leanda.guildhall.util

import android.app.Activity
import android.content.Intent
import android.view.View
import android.widget.PopupMenu
import android.widget.TextView
import edu.cit.leanda.guildhall.admin.AdminDashboardActivity
import edu.cit.leanda.guildhall.auth.LoginActivity
import edu.cit.leanda.guildhall.chat.ChatActivity
import edu.cit.leanda.guildhall.guild.GuildsActivity
import edu.cit.leanda.guildhall.profile.ProfileActivity
import edu.cit.leanda.guildhall.quest.AcceptedQuestsActivity
import edu.cit.leanda.guildhall.quest.CommissionedQuestsActivity

object GuildHallNavbar {
    fun setup(activity: Activity, chatButton: View?, profileButton: TextView?) {
        val session = SessionManager(activity)
        profileButton?.text = (session.getUsername() ?: "A").take(1).uppercase()
        chatButton?.setOnClickListener {
            activity.startActivity(Intent(activity, ChatActivity::class.java))
        }
        profileButton?.setOnClickListener { anchor ->
            val menu = PopupMenu(activity, anchor)
            menu.menu.add("Profile")
            menu.menu.add("Commissioned Quests")
            menu.menu.add("Accepted Quests")
            if (session.getRole() == "ROLE_ADMIN" || session.isGuildmaster()) {
                menu.menu.add("Admin Dashboard")
                menu.menu.add("Adventurer Dashboard")
            }
            menu.menu.add("Log Out")
            menu.setOnMenuItemClickListener { item ->
                when (item.title.toString()) {
                    "Profile" -> activity.startActivity(Intent(activity, ProfileActivity::class.java))
                    "Commissioned Quests" -> activity.startActivity(Intent(activity, CommissionedQuestsActivity::class.java))
                    "Accepted Quests" -> activity.startActivity(Intent(activity, AcceptedQuestsActivity::class.java))
                    "Admin Dashboard" -> activity.startActivity(Intent(activity, AdminDashboardActivity::class.java))
                    "Adventurer Dashboard" -> activity.startActivity(Intent(activity, GuildsActivity::class.java))
                    "Log Out" -> {
                        session.clearSession()
                        activity.startActivity(Intent(activity, LoginActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        })
                        activity.finish()
                    }
                }
                true
            }
            menu.show()
        }
    }
}
