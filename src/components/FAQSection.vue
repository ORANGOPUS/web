<template>
  <section class="faq-section">
    <div class="faq-background">
      <div class="faq-particles"></div>
    </div>
    <div class="faq-content">
      <h2 class="section-title animate-on-scroll">Frequently Asked Questions</h2>
      <div class="faq-list">
        <FAQItem
          v-for="(item, index) in faqItems"
          :key="index"
          :question="item.question"
          :answer="item.answer"
          :style="{ animationDelay: `${index * 0.1}s` }"
          class="faq-item-animate"
        />
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { contentService } from "@/services/contentService";
import { isSupabaseConfigured } from "@/lib/supabase";
import FAQItem from "./FAQItem.vue";

export default defineComponent({
  name: "FAQSection",
  components: {
    FAQItem,
  },
  data() {
    return {
      faqItems: [
        { question: "What is Orangopus?", answer: "Orangopus is a grassroots nonprofit open collective supporting creators of all backgrounds. No gatekeepers, no agendas." },
        { question: "Who is this for?", answer: "Orangopus is for creators, developers, dreamers, and anyone interested in collaborative, open-source projects." },
        { question: "How do I get started?", answer: "You can start by exploring our projects on GitHub, joining our Discord community, or contributing to one of our open-source initiatives." },
        { question: "How can I support the project?", answer: "You can support Orangopus by contributing code, sharing ideas, spreading the word, or making a donation to help fund our initiatives." },
        { question: "Where does all your money go?", answer: "As a non-profit, all funds go directly into supporting our projects, maintaining our infrastructure, and furthering our mission of accessible innovation." },
      ],
    };
  },
  async mounted() {
    this.observeElements();
    // Admins edit the FAQs in Supabase (faqs table); the list above is the fallback.
    if (!isSupabaseConfigured) return;
    const faqs = await contentService.getFAQs();
    if (faqs.length) this.faqItems = faqs.map(f => ({ question: f.question, answer: f.answer }));
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
.faq-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120px 40px;
  gap: 60px;
  position: relative;
  overflow: hidden;
  min-height: 80vh;
}

.faq-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}

.faq-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(1px 1px at 25% 35%, rgba(255, 145, 60, 0.2), transparent),
    radial-gradient(1px 1px at 65% 75%, rgba(255, 255, 255, 0.1), transparent),
    radial-gradient(2px 2px at 85% 25%, rgba(255, 145, 60, 0.15), transparent),
    radial-gradient(1px 1px at 45% 85%, rgba(255, 255, 255, 0.08), transparent);
  background-size: 350px 350px, 250px 250px, 400px 400px, 300px 300px;
  animation: faq-float 20s ease-in-out infinite;
}

@keyframes faq-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-10px) rotate(0.3deg); }
  66% { transform: translateY(5px) rotate(-0.3deg); }
}

.faq-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 50px;
  max-width: 800px;
  width: 100%;
}

.section-title {
  color: #ffffff;
  font-family: "Manrope", Helvetica;
  font-size: clamp(48px, 6vw, 72px);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1.1;
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

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 600px;
}

.faq-item-animate {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
  animation: faqItemAppear 0.6s ease-out forwards;
}

@keyframes faqItemAppear {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 768px) {
  .faq-section {
    padding: 80px 20px;
    gap: 40px;
    min-height: 60vh;
  }
  
  .faq-content {
    gap: 40px;
  }
  
  .section-title {
    font-size: clamp(36px, 8vw, 56px);
  }
  
  .faq-list {
    gap: 15px;
  }
}
</style>
