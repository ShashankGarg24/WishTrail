import React, { useRef, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';

const BLUE = '#2e8cff';
const PHOTO = require('../assets/onboarding-runner.png');
const slides = [
  { title: 'Turn your\ndreams into\n', accent: 'progress.', body: 'Set meaningful goals, break them into smaller steps, and watch yourself move forward.' },
  { title: 'Build habits.\nUnderstand\n', accent: 'your journey.', body: 'Stay consistent, track your progress, reflect on how you feel, and become a better you.' },
  { title: 'Progress is\n', accent: 'better together.', body: 'Share your wins, follow friends, join communities, and stay motivated with people on similar journeys.' },
];

function Note({ children, right = false }) {
  return <View style={[s.note, right && { alignSelf: 'flex-end' }]}><Text style={s.handArrow}>{right ? '⤴' : '⤴'}</Text><Text style={s.hand}>{children}</Text></View>;
}

function GoalCard() {
  return <View style={s.art} accessible accessibilityLabel="Goal: Run my first 10K, 72 percent complete. Small steps, big wins.">
    <View style={[s.backplate, { transform: [{ rotate: '-12deg' }] }]} />
    <View style={[s.card, { transform: [{ rotate: '-8deg' }] }]}>
      <View style={s.row}><Text style={s.target}>◎</Text><View style={s.grow}><Text style={s.cardTitle}>Run my first 10K</Text><Text style={s.small}>Fitness · High Priority</Text></View><Text style={s.chevron}>›</Text></View>
      <Text style={s.percent}>72%</Text><View style={s.track}><View style={s.progress} /></View>
      <View style={[s.row, { marginTop: 22, alignItems: 'stretch' }]}><View style={s.grow}>
        {['Run 5K continuously', 'Run 3x this week', 'Complete 10K', 'Celebrate this milestone! 🎉'].map((label, i) => <View key={label} style={s.task}><View style={[s.check, i > 1 && s.unchecked]}><Text style={s.tick}>{i < 2 ? '✓' : ''}</Text></View><Text style={s.taskText}>{label}</Text></View>)}
      </View><Image source={PHOTO} style={s.goalPhoto} /></View>
    </View>
    <Note>Small steps{ '\n' }Big wins</Note>
  </View>;
}

function HabitsCard() {
  return <View style={s.art} accessible accessibilityLabel="Read for 30 minutes, five of seven days this week. Track habits and your mindset.">
    <View style={[s.backplate, { backgroundColor: '#f2f4ef', transform: [{ rotate: '-12deg' }] }]} />
    <View style={[s.card, { transform: [{ rotate: '-5deg' }], marginTop: 0 }]}>
      <View style={s.row}><Text style={s.sun}>☼</Text><Text style={[s.small, s.grow]}>Daily Habit</Text><Text style={s.cardTitle}>🔥 12</Text></View>
      <Text style={[s.cardTitle, { marginLeft: 34, marginTop: 12 }]}>Read for 30 minutes</Text><Text style={[s.small, { marginLeft: 34 }]}>5/7 this week</Text>
      <View style={s.week}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => <View key={day} style={s.day}><Text style={s.dayLabel}>{day}</Text><View style={[s.dayCircle, i < 5 && { backgroundColor: '#67d99a' }]}><Text style={s.dayTick}>{i < 5 ? '✓' : ''}</Text></View></View>)}</View>
    </View>
    <View style={[s.card, { transform: [{ rotate: '-4deg' }], marginTop: 14, paddingVertical: 20 }]}>
      <Text style={s.cardTitle}><Text style={{ color: BLUE }}>☻  </Text>How did you feel today?</Text>
      <View style={s.moods}>{['☹', '😐', '☺', '☺', '🤩'].map((face, i) => <View key={i} style={[s.mood, { backgroundColor: ['#fff0f3', '#fff6e8', '#eaf5ff', '#e9fbf2', '#f3edff'][i] }, i === 2 && s.selectedMood]}><Text style={{ fontSize: 30, color: ['#f58492', '#dfb454', BLUE, '#60cb91', '#a279e7'][i] }}>{face}</Text></View>)}</View>
    </View>
    <Note right>Track habits{ '\n' }and your mindset</Note>
  </View>;
}

function CommunityCard() {
  return <View style={s.art} accessible accessibilityLabel="Tanya shared her first 10K run. Share, connect and grow together.">
    <View style={[s.card, { transform: [{ rotate: '-3deg' }], padding: 20 }]}>
      <View style={s.row}><View style={s.avatar}><Text style={s.avatarText}>T</Text></View><View style={s.grow}><Text style={s.cardTitle}>Tanya</Text><Text style={s.small}>2h ago</Text></View><Text style={s.small}>•••</Text></View>
      <Text style={[s.cardTitle, { marginTop: 14 }]}>Ran my first 10K! 🏃</Text><Text style={s.postBody}>Months of small steps, finally here.{ '\n' }So grateful for this community! 💙</Text>
      <Image source={PHOTO} style={s.communityPhoto} />
      <View style={s.likes}><View style={s.miniAvatars}>{['T', 'J', 'A', 'M'].map((letter, i) => <View key={letter} style={[s.miniAvatar, { backgroundColor: ['#9b705d', '#657e91', '#4c9d93', '#a58163'][i] }]}><Text style={{ color: 'white', fontSize: 8 }}>{letter}</Text></View>)}</View><Text style={s.small}>and 12 others liked this</Text></View>
      <View style={[s.bubble, { left: -20, bottom: 128 }]}><Text style={s.bubbleText}>❤️ 24</Text></View><View style={[s.bubble, { right: -16, bottom: 72 }]}><Text style={s.bubbleText}>💬 6</Text></View>
    </View>
    <Note right>Share, connect +{ '\n' }and grow together</Note>
  </View>;
}

export default function Onboarding({ onFinish }) {
  const { width, height, fontScale } = useWindowDimensions();
  const pager = useRef(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const illustrationScale = page => Math.min((width - 40) / 350,
    Math.max(0.55, (height - (page === 2 ? 400 : 445) * Math.max(fontScale, 1)) / 420));
  const finish = async (signIn = false) => {
    if (busy) return;
    setBusy(true);
    try { await onFinish(signIn); } finally { setBusy(false); }
  };
  return <View style={s.screen}>
    <View style={s.top}><Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" disabled={busy} hitSlop={12} onPress={() => finish()}><Text style={s.skip}>Skip</Text></Pressable></View>
    <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
      {slides.map((slide, i) => <ScrollView key={i} style={{ width }} contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={[s.title, { fontSize: width < 380 ? 34 : 38 }]}>{slide.title}<Text style={s.accent}>{slide.accent}</Text></Text>
        <Text style={s.body}>{slide.body}</Text>
        <View style={{ height: 420 * illustrationScale(i), alignItems: 'center', marginTop: 25 }}><View style={{ width: 350, transform: [{ scale: illustrationScale(i) }], transformOrigin: 'top center' }}>{i === 0 ? <GoalCard /> : i === 1 ? <HabitsCard /> : <CommunityCard />}</View></View>
      </ScrollView>)}
    </ScrollView>
    <View style={s.footer}>{index < 2 ? <View style={s.row}>
      <View style={[s.row, s.grow]}>{slides.map((_, i) => <View key={i} accessibilityLabel={`Page ${i + 1}${index === i ? ', selected' : ''}`} style={[s.dot, index === i && { backgroundColor: BLUE }]} />)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Next onboarding page" style={s.next} onPress={() => { pager.current?.scrollTo({ x: (index + 1) * width, animated: true }); setIndex(index + 1); }}><Text style={s.arrow}>→</Text></Pressable>
    </View> : <View><Pressable accessibilityRole="button" disabled={busy} style={s.start} onPress={() => finish()}><Text style={s.startText}>Start Your Trail →</Text></Pressable><View style={[s.row, { justifyContent: 'center', marginTop: 18 }]}><Text style={s.signInText}>Already have an account? </Text><Pressable accessibilityRole="button" hitSlop={10} disabled={busy} onPress={() => finish(true)}><Text style={[s.signInText, { color: BLUE, fontWeight: '600' }]}>Sign in</Text></Pressable></View></View>}</View>
  </View>;
}

const s = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fafdff', zIndex: 30 },
  top: { height: 58, paddingHorizontal: 26, justifyContent: 'center', alignItems: 'flex-end' }, skip: { color: '#4c6788', fontSize: 16 },
  page: { paddingHorizontal: 28, paddingBottom: 10 }, title: { color: '#0a1b2d', fontWeight: '600', letterSpacing: -1.1, lineHeight: 44 }, accent: { color: BLUE },
  body: { color: '#56718f', fontSize: 17, lineHeight: 24, marginTop: 14 },
  footer: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: 24, minHeight: 90 }, row: { flexDirection: 'row', alignItems: 'center' }, grow: { flex: 1 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#dce8f4', marginRight: 13 }, next: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#d4e9ff', alignItems: 'center', justifyContent: 'center' }, arrow: { color: BLUE, width: 26, height: 26, transform: [{ translateX: 13 }, { scale: 2.5 }] },
  arrowShaft: { position: 'absolute', left: 1, top: 12, width: 24, height: 2, borderRadius: 1, backgroundColor: BLUE },
  arrowHead: { position: 'absolute', right: 3, top: 7, width: 12, height: 12, borderTopWidth: 2, borderRightWidth: 2, borderColor: BLUE, transform: [{ rotate: '45deg' }] },
  start: { borderRadius: 30, height: 55, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, startText: { fontSize: 18, fontWeight: '600', color: '#fff' }, signInText: { color: '#57718f', fontSize: 14 },
  art: { paddingHorizontal: 12, paddingTop: 18 }, backplate: { position: 'absolute', top: 60, left: 0, right: 0, height: 240, borderRadius: 25, backgroundColor: '#e5f1ff' },
  card: { backgroundColor: '#fff', borderRadius: 23, padding: 20, shadowColor: '#a6c8eb', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  cardTitle: { color: '#0b192c', fontWeight: '600', fontSize: 16 }, small: { color: '#597597', fontSize: 12, marginTop: 4 }, target: { color: BLUE, fontSize: 38, marginRight: 12 }, chevron: { color: '#4b6685', fontSize: 30 }, percent: { textAlign: 'right', fontWeight: '600', marginTop: 12 }, track: { height: 10, borderRadius: 5, backgroundColor: '#e8f0f7', marginTop: 4 }, progress: { width: '72%', height: 10, borderRadius: 5, backgroundColor: BLUE },
  task: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 }, check: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#63d89a', marginRight: 8, alignItems: 'center', justifyContent: 'center' }, unchecked: { backgroundColor: 'white', borderWidth: 2, borderColor: '#e1ecf7' }, tick: { color: '#fff', fontSize: 16 }, taskText: { fontSize: 11, color: '#547192', flexShrink: 1 }, goalPhoto: { width: 80, height: 134, borderRadius: 14, marginLeft: 4 },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingHorizontal: 26 }, handArrow: { color: '#6281a0', fontSize: 49, marginRight: 12, transform: [{ rotate: '-35deg' }] }, hand: { color: '#577797', fontSize: 18, lineHeight: 23, fontStyle: 'italic', textAlign: 'center', fontFamily: Platform.OS === 'android' ? 'cursive' : 'Noteworthy', transform: [{ rotate: '-7deg' }] },
  sun: { fontSize: 30, color: BLUE, marginRight: 12 }, week: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eef4fa', marginTop: 18, paddingTop: 12, justifyContent: 'space-between' }, day: { alignItems: 'center' }, dayLabel: { fontSize: 11, color: '#6380a0', marginBottom: 9 }, dayCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#edf3f8', alignItems: 'center', justifyContent: 'center' }, dayTick: { color: '#fff', fontSize: 19 }, moods: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }, mood: { width: 47, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, selectedMood: { borderColor: BLUE, borderWidth: 1.5 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#b7d7d0', marginRight: 10, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#28544d', fontWeight: '700', fontSize: 21 }, postBody: { color: '#55718f', lineHeight: 20, fontSize: 14, marginTop: 7 }, communityPhoto: { width: '100%', height: 135, borderRadius: 13, marginTop: 14 }, likes: { flexDirection: 'row', alignItems: 'center', marginTop: 13 }, miniAvatars: { flexDirection: 'row', marginRight: 7 }, miniAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: 'white', marginLeft: -3, alignItems: 'center', justifyContent: 'center' }, bubble: { position: 'absolute', backgroundColor: '#fff', borderRadius: 15, padding: 12, elevation: 3, shadowColor: '#bed1e4', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, bubbleText: { color: '#476281', fontSize: 14 },
});
