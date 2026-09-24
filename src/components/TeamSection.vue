<template>
  <section class="team-section">
    <div class="section-background">
      <div class="floating-particles"></div>
    </div>
    <h2 class="section-title animate-on-scroll">The Humans Behind Orangopus</h2>
    <p class="section-description animate-on-scroll">
      Designers. Developers. Dreamers. These are the people shaping the
      galaxy with us.
    </p>
    <div class="team-container">
      <TeamMember 
        v-for="(member, index) in teamMembers" 
        :key="member.name" 
        :member="member" 
        :style="{ animationDelay: `${index * 0.1}s` }"
        class="team-member-animate"
      />
    </div>
    <div class="discord-cta animate-on-scroll">
      <SocialIcons class="discord-icon" />
      <span>Join Our Discord</span>
      <div class="cta-glow"></div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { contentService } from "@/services/contentService";
import { isSupabaseConfigured } from "@/lib/supabase";
import TeamMember from "./TeamMember.vue";
import SocialIcons from "../icons/SocialIcons/SocialIcons.vue";

export default defineComponent({
  name: "TeamSection",
  components: {
    TeamMember,
    SocialIcons,
  },
  data() {
    return {
      teamMembers: [
        { name: "Cheesecastv20053", role: "Founder" },
        { name: "Ellie@opus", role: "Team" },
        { name: "Jordan@opus", role: "Team" },
        { name: "Rim@opus", role: "Team" },
        { name: "Tortle@opus", role: "Team" },
        { name: "Silasonlinux", role: "Team" },
        { name: "Tvgameruk", role: "Team" },
        { name: "Runawaylobster", role: "Modopus" },
        { name: "Hugjunkie", role: "Pentopus" },
        { name: "Bootleghumanpennythief6668", role: "Octonaut" },
        // Add more team members here
      ],
    };
  },
  async mounted() {
    this.observeElements();
    // Admins edit the team in Supabase (team_members table); the list above is the fallback.
    if (!isSupabaseConfigured) return;
    const members = await contentService.getTeamMembers();
    if (members.length) this.teamMembers = members.map(m => ({ name: m.name, role: m.role || "Team" }));
  },
  methods: {
    observeElements() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
      });
    }
  }
});
</script>

<style scoped>
.team-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120px 40px;
  gap: 60px;
  position: relative;
  overflow: hidden;
}

.section-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}

.floating-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(1px 1px at 25% 25%, rgba(255, 145, 60, 0.3), transparent),
    radial-gradient(1px 1px at 75% 75%, rgba(255, 255, 255, 0.2), transparent),
    radial-gradient(2px 2px at 50% 10%, rgba(255, 145, 60, 0.2), transparent),
    radial-gradient(1px 1px at 10% 80%, rgba(255, 255, 255, 0.1), transparent),
    radial-gradient(2px 2px at 90% 40%, rgba(255, 145, 60, 0.3), transparent);
  background-size: 200px 200px, 300px 300px, 150px 150px, 250px 250px, 180px 180px;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(1deg); }
  66% { transform: translateY(10px) rotate(-1deg); }
}

.section-title {
  color: #ffffff;
  font-family: "Manrope", Helvetica;
  font-size: clamp(48px, 6vw, 80px);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.3;
  text-align: center;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #ff913c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
}

.section-title.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.section-description {
  color: rgba(255, 255, 255, 0.7);
  font-family: "Manrope", Helvetica;
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 400;
  letter-spacing: -0.5px;
  line-height: 1.4;
  text-align: center;
  max-width: 800px;
  margin: 0;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease 0.2s;
}

.section-description.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.team-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.team-member-animate {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
  animation: teamMemberAppear 0.6s ease-out forwards;
}

@keyframes teamMemberAppear {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.discord-cta {
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 145, 60, 0.1) 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  padding: 20px 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease 0.4s;
}

.discord-cta.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.discord-cta:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 145, 60, 0.2) 100%);
  border-color: rgba(255, 145, 60, 0.4);
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 145, 60, 0.2);
}

.cta-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 145, 60, 0.2), transparent);
  transition: left 0.6s ease;
}

.discord-cta:hover .cta-glow {
  left: 100%;
}

.discord-icon {
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 0 10px rgba(255, 145, 60, 0.5));
}


.discord-cta span {
  color: #ffffff;
  font-family: "Manrope", Helvetica;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .team-section {
    padding: 80px 20px;
    gap: 40px;
  }
  
  .team-container {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }
  
  .discord-cta {
    padding: 15px 25px;
  }
  
  .discord-cta span {
    font-size: 16px;
  }
}
</style>
