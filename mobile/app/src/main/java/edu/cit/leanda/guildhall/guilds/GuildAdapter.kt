package edu.cit.leanda.guildhall.guild

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import edu.cit.leanda.guildhall.R

class GuildAdapter(
    private var guilds: List<GuildItem>
) : RecyclerView.Adapter<GuildAdapter.GuildViewHolder>() {

    var onGuildClick: ((GuildItem) -> Unit)? = null

    inner class GuildViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvName: TextView        = itemView.findViewById(R.id.tvGuildName)
        val tvMemberCount: TextView = itemView.findViewById(R.id.tvMemberCount)
        val tvQuestCount: TextView  = itemView.findViewById(R.id.tvQuestCount)
        val tvDescription: TextView = itemView.findViewById(R.id.tvGuildDescription)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GuildViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_guild, parent, false)
        return GuildViewHolder(view)
    }

    override fun onBindViewHolder(holder: GuildViewHolder, position: Int) {
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

        holder.itemView.setOnClickListener {
            onGuildClick?.invoke(guild)
        }
    }

    override fun getItemCount(): Int = guilds.size

    fun updateData(newGuilds: List<GuildItem>) {
        guilds = newGuilds
        notifyDataSetChanged()
    }
}