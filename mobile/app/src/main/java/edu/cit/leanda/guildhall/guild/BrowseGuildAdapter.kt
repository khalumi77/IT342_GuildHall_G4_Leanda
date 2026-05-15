package edu.cit.leanda.guildhall.guild

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import edu.cit.leanda.guildhall.R

class BrowseGuildAdapter(
    private var guilds: List<BrowseGuildItem>,
    private val onJoinClick: (BrowseGuildItem) -> Unit
) : RecyclerView.Adapter<BrowseGuildAdapter.ViewHolder>() {

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvName: TextView        = itemView.findViewById(R.id.tvGuildName)
        val tvDescription: TextView = itemView.findViewById(R.id.tvGuildDescription)
        val tvMemberCount: TextView = itemView.findViewById(R.id.tvMemberCount)
        val tvQuestCount: TextView  = itemView.findViewById(R.id.tvQuestCount)
        val btnJoin: MaterialButton = itemView.findViewById(R.id.btnJoin)
        val tvJoined: TextView      = itemView.findViewById(R.id.tvJoined)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_browse_guild, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val guild = guilds[position]

        holder.tvName.text        = guild.name
        holder.tvMemberCount.text = guild.memberCount.toString()
        holder.tvQuestCount.text  = guild.questCount.toString()

        if (guild.description.isBlank()) {
            holder.tvDescription.visibility = View.GONE
        } else {
            holder.tvDescription.visibility = View.VISIBLE
            holder.tvDescription.text       = guild.description
        }

        if (guild.isMember) {
            holder.btnJoin.visibility  = View.GONE
            holder.tvJoined.visibility = View.VISIBLE
        } else {
            holder.btnJoin.visibility  = View.VISIBLE
            holder.tvJoined.visibility = View.GONE
            holder.btnJoin.setOnClickListener { onJoinClick(guild) }
        }
    }

    override fun getItemCount(): Int = guilds.size

    fun updateData(newGuilds: List<BrowseGuildItem>) {
        guilds = newGuilds
        notifyDataSetChanged()
    }
}