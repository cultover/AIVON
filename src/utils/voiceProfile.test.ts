import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../data/hotelManual';
import {
  FEMALE_VOICES,
  MALE_VOICES,
  buildSpeechStylePrompt,
  computeFallbackSpeechParams,
  pickFallbackBrowserVoice,
  resolveGuestVoiceProfile,
} from './voiceProfile';

test('all 16 scenarios map male guests strictly to male voices and female guests strictly to female voices with portrait age metadata', () => {
  assert.equal(SCENARIOS.length, 16);

  for (const scenario of SCENARIOS) {
    const profile = resolveGuestVoiceProfile(scenario.id, scenario.guestGender);
    assert.equal(profile.gender, scenario.guestGender);
    assert.ok(profile.ageGroup.includes(scenario.guestGender === 'male' ? '남성' : '여성'));
    assert.ok(profile.ageDescriptor.length > 4);
    assert.ok(profile.vocalRegister.length > 10);
    assert.ok(profile.fallbackPitch >= 0.78 && profile.fallbackPitch <= 1.2);
    assert.ok(profile.fallbackRate >= 0.9 && profile.fallbackRate <= 1.12);

    if (scenario.guestGender === 'male') {
      assert.equal(
        MALE_VOICES.includes(profile.voiceName),
        true,
        `${scenario.id} (${scenario.guestName}) should use a male voice, got ${profile.voiceName}`
      );
    } else {
      assert.equal(
        FEMALE_VOICES.includes(profile.voiceName),
        true,
        `${scenario.id} (${scenario.guestName}) should use a female voice, got ${profile.voiceName}`
      );
    }
  }
});

test('older portraits receive noticeably deeper vocal pitch and slower cadence than younger portraits of the same gender', () => {
  const patriarch50s = resolveGuestVoiceProfile('rank-manager-escalation', 'male');
  const spaGuest30s = resolveGuestVoiceProfile('pool-hygiene-locker', 'male');
  assert.ok(
    patriarch50s.fallbackPitch < spaGuest30s.fallbackPitch,
    `50s male (${patriarch50s.fallbackPitch}) should have lower pitch than 30s male (${spaGuest30s.fallbackPitch})`
  );
  assert.ok(patriarch50s.fallbackRate < spaGuest30s.fallbackRate);
  assert.match(patriarch50s.ageGroup, /50대/);
  assert.match(spaGuest30s.ageGroup, /30대/);

  const vipMadame50s = resolveGuestVoiceProfile('unreasonable-vip', 'female');
  const allergyYoungFemale = resolveGuestVoiceProfile('culinary-allergy', 'female');
  assert.ok(
    vipMadame50s.fallbackPitch < allergyYoungFemale.fallbackPitch,
    `50s female (${vipMadame50s.fallbackPitch}) should have lower pitch than early-30s female (${allergyYoungFemale.fallbackPitch})`
  );
  assert.ok(vipMadame50s.fallbackRate < allergyYoungFemale.fallbackRate);
  assert.match(vipMadame50s.ageGroup, /50대/);
  assert.match(allergyYoungFemale.ageGroup, /30대 초반/);
});

test('buildSpeechStylePrompt embeds exact portrait age, gender, vocal register, and emotion delivery', () => {
  const vip50sProfile = resolveGuestVoiceProfile('unreasonable-vip', 'female');
  const exec40sProfile = resolveGuestVoiceProfile('double-checkin', 'male');

  const furiousVipPrompt = buildSpeechStylePrompt(vip50sProfile, 'furious');
  const satisfiedExecPrompt = buildSpeechStylePrompt(exec40sProfile, 'satisfied');

  assert.match(furiousVipPrompt, /female/i);
  assert.match(furiousVipPrompt, /50s|56/i);
  assert.match(furiousVipPrompt, /alto/i);
  assert.match(furiousVipPrompt, /upset|tense/i);

  assert.match(satisfiedExecPrompt, /male/i);
  assert.match(satisfiedExecPrompt, /40s|44/i);
  assert.match(satisfiedExecPrompt, /baritone/i);
  assert.match(satisfiedExecPrompt, /warm|relieved/i);
  assert.notEqual(furiousVipPrompt, satisfiedExecPrompt);
});

test('computeFallbackSpeechParams adapts speech rate to emotion while preserving age pitch separation', () => {
  const olderMale = resolveGuestVoiceProfile('rank-manager-escalation', 'male');
  const youngerMale = resolveGuestVoiceProfile('room-noise', 'male');

  const olderFurious = computeFallbackSpeechParams(olderMale, 'furious');
  const olderCalm = computeFallbackSpeechParams(olderMale, 'calm');
  const youngerFurious = computeFallbackSpeechParams(youngerMale, 'furious');

  assert.ok(olderFurious.rate > olderCalm.rate);
  assert.ok(olderFurious.pitch < youngerFurious.pitch);
});

test('pickFallbackBrowserVoice prefers gender-matched neural Korean voices', () => {
  const mockVoices = [
    { name: 'Microsoft SunHi Online (Natural) - Korean', lang: 'ko-KR' },
    { name: 'Microsoft InJoon Online (Natural) - Korean', lang: 'ko-KR' },
    { name: 'Google US English', lang: 'en-US' },
  ];

  const malePick = pickFallbackBrowserVoice(mockVoices, 'male');
  const femalePick = pickFallbackBrowserVoice(mockVoices, 'female');

  assert.equal(malePick?.name, 'Microsoft InJoon Online (Natural) - Korean');
  assert.equal(femalePick?.name, 'Microsoft SunHi Online (Natural) - Korean');
});
