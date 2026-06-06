/**
 * visualClarity.js — Visual Clarity Expert.
 *
 * Checks each slide for text density, bullet count, hierarchy,
 * projector-readability, jargon, empty slides.
 */

import { finding, slideBodyWordCount } from './framework.js';

export const visualClarityExpert = {
  id: 'visualClarity',
  name: 'Maya Lindqvist',
  role: 'Visual Clarity Expert',
  expertiseAreas: ['Slide design', 'Text density', 'Hierarchy', 'Projector readability'],
  yearsExperience: 14,
  systemPrompt: 'You are a senior presentation designer with 14 years experience reviewing B2B decks. Audit each slide for density, bullets, hierarchy, jargon, projector readability.',

  review(ctx) {
    const findings = [];
    const { slides } = ctx;

    let denseSlides = 0;
    let manyBulletsSlides = 0;
    let emptySlides = 0;
    let longTitleSlides = 0;

    slides.forEach((slide, idx) => {
      const titleLen = (slide.title || '').length;
      const bodyWords = slideBodyWordCount(slide);
      const bullets = slide.bullets || [];

      // PRES-EMPTY-SLIDE-001 — slide has no body content at all (except title slide)
      if (idx > 0 && bodyWords === 0 && (!slide.body || slide.body.trim() === '')) {
        emptySlides++;
      }

      // PRES-DENSE-001 — too much text on one slide
      if (bodyWords > 35) {
        denseSlides++;
      }

      // PRES-BULLETS-001 — too many bullets
      if (bullets.length > 7) {
        manyBulletsSlides++;
      }

      // PRES-TITLE-LONG-001 — title is too long
      if (titleLen > 80) {
        longTitleSlides++;
      }
    });

    if (denseSlides >= 1) {
      findings.push(finding({
        severity: denseSlides >= 3 ? 'high' : 'medium',
        ruleId: 'PRES-DENSE-001',
        title: `${denseSlides} slide(s) have too much text`,
        body: 'Slides with more than 60 words become walls of text. Audience reads instead of listens to you.',
        fix: 'Cut each dense slide to 30-50 words max. Move details to speaker notes or appendix.',
      }));
    }

    if (manyBulletsSlides >= 1) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-BULLETS-001',
        title: `${manyBulletsSlides} slide(s) have 8+ bullets`,
        body: 'Cognitive load research caps recall at 5-7 items per slide. Beyond that, audience remembers nothing.',
        fix: 'Cap bullets at 5-7 per slide. Split into two slides if needed.',
      }));
    }

    if (emptySlides >= 1) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PRES-EMPTY-SLIDE-001',
        title: `${emptySlides} slide(s) have no body content`,
        body: 'Empty slides confuse the audience and look unfinished.',
        fix: 'Either delete the empty slides or add the content they need.',
      }));
    }

    if (longTitleSlides >= 1) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PRES-TITLE-LONG-001',
        title: `${longTitleSlides} slide title(s) are too long`,
        body: 'Slide titles over 80 characters wrap on projector and look sloppy.',
        fix: 'Cut titles to 50-70 characters. Move qualifications to a sub-title.',
      }));
    }

    // PRES-NO-NOTES-001 — no speaker notes at all (across the whole deck)
    const totalNotesWords = slides.reduce((s, sl) => s + (sl.notes ? sl.notes.split(/\s+/).filter(Boolean).length : 0), 0);
    if (totalNotesWords < 30 && slides.length >= 5) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PRES-NO-NOTES-001',
        title: 'No speaker notes',
        body: 'Without notes you have to remember every talking point. Notes are your safety net + a useful handover artefact.',
        fix: 'Add 2-3 sentences of speaker notes per slide. Even rough notes beat blank.',
      }));
    }

    // PRES-PROJECTOR-FONT-001 — font size implied by lots of text + 1 column
    // (heuristic — fires when total content is huge but bullets few = body paragraphs)
    const longBodySlides = slides.filter((s) => (s.body || '').length > 400).length;
    if (longBodySlides >= 1) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PRES-PROJECTOR-FONT-001',
        title: `${longBodySlides} slide(s) have very long body paragraphs`,
        body: 'Paragraph-style slides force tiny fonts. Back-row audience can\'t read them.',
        fix: 'Convert to 3-5 bullets, or split into multiple slides.',
      }));
    }

    return findings;
  },
};
