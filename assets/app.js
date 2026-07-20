/* ============================================================================
   FrameWorkers demo site — shared behaviour (DEMOS data, portfolio filter,
   fake "generation" overlay → player).  Page-aware via <body data-page="…">.
   Dependency-free, offline.  Edit the 5 films in the DEMOS array below.
   ============================================================================ */

/* ============================ EDIT YOUR DEMOS HERE ============================ */
const DEMOS = [
  {
    key:"sorting_hat", title:"The Crown of Ash",
    genre:"3D · Dark Fantasy", cat:"Narrative",
    prompt:"On the night the castle finally falls, the thousand-year-old Sorting Hat is lowered onto the last trembling first-year — but for the first time in a thousand years it refuses to name a house, sensing the darkness this child will one day become, and the old headmaster quietly lifts it away, leaving the child alone in the emptied hall: the very abandonment that will forge the monster. Stylized 3D cartoon animation (Pixar / DreamWorks look — clearly animated, non-photoreal), spoken dialogue in English, English subtitles, with distant siege blasts, cracking stone, and foley.",
    src:"videos/sorting_hat.mp4", poster:"posters/sorting_hat.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"peking", title:"The Empty Stage",
    genre:"3D · 1937 Wartime", cat:"Narrative",
    prompt:"1937 武汉沦陷前夕，一个老京剧名角在最后一场《霸王别姬》谢幕后告诉徒弟一件事。风格化 3D 卡通动画（皮克斯 / 梦工厂质感，明确动画、非写实），中文（普通话）对白，英文字幕，配远处防空警报与轰炸闷响、空荡戏院的回响、京剧锣鼓与胡琴余韵及环境拟音。",
    prompt_en:"On the eve of Wuhan's fall in 1937, after his final curtain call of 'Farewell My Concubine,' an old Peking opera master tells his apprentice one last thing. Stylized 3D animation, with Chinese narration and Chinese dialogue, English subtitles, and foley.",
    src:"videos/peking.mp4", poster:"posters/peking.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"last_train", title:"Paper Boat in the Black Window",
    genre:"2D Anime · Occult", cat:"Narrative",
    prompt:"On the last midnight train rattling toward the city, a lone teenage exorcist moves down the swaying carriage to bind the vengeful spirit coiled around a sleeping passenger before the terminus — but in the black window-glass she sees the truth, that it is only a drowned child clinging to the one stranger who resembles its mother, and in the seconds before the doors open she must choose whether to seal it away forever or let it ride one more stop. Stylized 2D hand-drawn anime (modern dark-fantasy anime look — clearly hand-drawn, non-photoreal), spoken dialogue in Japanese, English subtitles, with rattling rails, the hum of failing fluorescents, snapping paper talismans, and foley.",
    src:"videos/last_train.mp4", poster:"posters/last_train.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"luchen", title:"Shatter",
    genre:"Donghua · Xianxia", cat:"Narrative",
    prompt:"玄幻修仙国漫短片《碎 · 第一集》：晚唐气质的山野宗门边陲，一间废墟般的旧屋，月光从破窗斜入。陆家在宗门山籍上只剩最后一个名字。白发青年陆沉盘膝吐纳，掌心只凝得起一缕细弱如灯芯的白色灵气——这点微薄修为，是陆家保住山籍的最后指望。三年一度的测灵复核之夜，一名孔武有力、周身缠绕幽绿灵气的执法修士破门而入，把唯一一枚测灵玉盘重重拍在他面前，逼他当掌按验：玉盘只亮起一丝微光，旋即黯灭。执法修士狞笑宣判：「灵根如死灰，也配占宗门名籍？陆沉，废物就该有废物的下场！」陆沉攥紧玉盘起身怒驳，还要再验一次；执法修士不耐，欺身上前一把扼住他手腕，掌中幽绿灵气暴涨与陆沉掌心残存的白芒猛然对撞、迸出刺目火花，随即被他一掌轰飞、整个人撞穿身后土墙。轰飞坠地的瞬间插入体内内视画面：丹田深处一枚琉璃般的微光灵核蛛网状布满裂纹，迸然碎裂，化作黯灭的光屑四散——这是全片题眼「碎」的正面画面，非写实、不血腥，只用光与裂纹表达。他瘫倒在尘灰碎石里，嘴角溢血，画外响起不甘的心声：「丹田破碎，仙途断绝……我终究沦为废人。」执法修士踏过碎石俯视着他，一脚碾住他撑地的手，补上最毒的一句：「辛辛苦苦修行，到头来一个废字。你和你家人，统统都是蝼蚁贱命！」\n\n就在这绝境，方才那一掌的余威透墙而出，震杀了暗伏屋外荒院荆棘后的骨豺妖兽——这是独立的一幕，给暴力余威与黑暗荒院足够的呼吸：幽绿余劲冲入空院，妖兽扑起被击中、摔落、腹部裂开一道暗红光缝。继而又一幕妖丹认主：一枚遍布裂纹、内里血红流光涌动的妖丹自妖兽尸身脱体，拖着血红流光穿过墙洞，落入陆沉染血的掌心，裂纹一条条亮起、红光沿掌纹爬上手腕。结尾定格：陆沉垂首握紧妖丹，开头那只只能托起细弱白光的手此刻被血红流光填满，红光映亮他半边脸，他缓缓抬眼，眼底掠过一线红芒——在碎裂的旧我之中，一股全新的力量正破壳而出。\n\n结构：约 5 个镜头（shot），由叙事密度决定不要凑时长。把「测灵判废 + 正面交锋轰飞」「丹田灵核内视碎裂」「妖兽伏诛（暴力余威 + 黑暗荒院）」「妖丹认主 + 握丹定格」当作各自独立的镜头分配，别把暴力与认主挤进同一镜。冲突要正面、有压迫：对峙—怒驳—灵气对撞—镇压一掌，节奏紧。\n\n风格：暗黑电影感的彩色国漫插画（干净自信的墨线＋厚涂上色，明确是手绘漫画、非写实、非 3D）；冷调月光下的破败屋舍，幽绿灵气与血红妖丹形成强烈冷暖对比。全片三次光点事件构成意象轴：测灵玉盘黯灭（被判废）→ 丹田灵核碎灭（旧我崩解）→ 妖丹亮起（新力认主）；测灵玉盘全片只有一枚、首次出现在执法者拍盘验灵那一刻，此前画面里不得出现任何盘状物，陆沉掌心的灵气是一缕细弱条状光丝、不是圆盘。中文（普通话），以陆沉第一人称画外内心独白贯穿全片＋反派的宣判与怒骂对白（不要第三人称说书人旁白），中文字幕，全程 foley（破门、玉盘坠地、灵气对撞炸裂、身体撞穿土墙、碎石飞溅、夜风，低沉压抑的弦乐铺底）。约 70 秒左右（软目标，叙事优先，不要为压时长牺牲呼吸感）。情绪弧：保籍隐忍 → 测灵判废与正面交锋的羞辱碾压 → 丹田破碎的痛悟 → 妖兽伏诛的余威 → 妖丹认主、命运微光乍现。",
    prompt_en:"《Shatter · Episode 1》— a xianxia cultivation short. On a late-Tang night at a ruined mountain-sect outpost, white-haired Lu Chen — the last name left on his clan's sect rolls — can raise only a wick-thin thread of white spirit-energy. On the triennial spirit-test, a green-aura enforcer forces his palm onto the lone jade testing-disc; it flickers and dies. The enforcer brands his spirit-root 'dead ash,' seizes his wrist, and a clash of energies blasts him through the wall — his glass-like spirit-core, webbed with cracks, shatters. But the blow's residual force also slays a bone-jackal demon lurking in the yard, and its cracked, crimson demon-core answers his blood, filling the 'cripple's' palm with a red light that belongs to no orthodox path. Stylized 2D hand-drawn Chinese animation (donghua — clean ink lines, thick painterly color, dark cinematic illustration, non-photoreal, non-3D), Lu Chen's first-person inner monologue and the enforcer's dialogue in Mandarin, Chinese subtitles, and foley.",
    src:"videos/luchen.mp4", poster:"posters/luchen.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"saiweng", title:"Blessing in Disguise",
    genre:"Ink-wash · Fable", cat:"Adaptation",
    prompt:"古时长城脚下的边塞人家，塞翁的骏马一夜走失，邻人皆来惋惜，他只淡淡道\"此何遽不为福乎\"——数月后那马竟领着一群胡马归来，众人来贺，他却说未必非祸；其子爱骑新马，纵马坠地折了腿，众人来慰，他仍说未必非福；不久胡兵大举入侵，村中青壮十死其九，独其子因瘸腿得免征戍，父子相守：四度祸福相倚，皆在老人始终平静的面容上静静流转。中国传统写意水墨画风格（大面积留白、浓淡墨色晕染、长卷般的呼吸感——明显是手绘水墨，非写实、非 3D），说书人中文旁白配极简人物对白，英文字幕，伴以塞外长风、马蹄踏尘、远处隐约战鼓与一声悠长胡笳，全程 foley。",
    prompt_en:"On the northern frontier below the Great Wall, an old man's prized horse vanishes one night; the neighbors come to console him, and he only says lightly, 'How do you know this isn't a blessing?' Months later the horse returns leading a herd of wild steppe horses — they congratulate him, and he says it may yet be a misfortune; his son, riding the new horse, is thrown and breaks his leg — they console him, and he still says it may yet be a blessing; soon the nomads invade, nine of every ten village youths die in battle, but his lame son is spared conscription, and father and son remain together: four turns of fortune and misfortune intertwined, all passing across the old man's ever-calm face. Traditional Chinese xieyi ink-wash painting (vast negative space, graded ink washes, the breath of a handscroll — hand-painted ink, non-photoreal), a storyteller's Chinese narration over minimal dialogue, English subtitles, with frontier wind, hoofbeats, distant war drums, a lone reed-pipe cry, and foley.",
    src:"videos/saiweng.mp4", poster:"posters/saiweng.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"sherlock", title:"The Blue Wax at the Keyhole",
    genre:"Graphic-novel · Mystery", cat:"Adaptation",
    prompt:"A classic Sherlock Holmes locked-room mystery, about 90 seconds. A gentleman is found dead in his bolted study and the Yard calls it suicide, but Holmes reads the clues, proves it was murder, and names the real killer — the victim's private secretary — standing right there in the room. A clear, straightforward deduction (no flashbacks) where Holmes explains his reasoning aloud. Colored graphic-novel style, English dialogue, English subtitles, foley.",
    src:"videos/sherlock.mp4", poster:"posters/sherlock.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"psa", title:"Don't Gamble on a Bite",
    genre:"Explainer · Public Health", cat:"Explainer",
    prompt:"健康科普公益短片：《被猫狗抓咬后，记住\"一冲、二消、三就医、四打针\"》\n\n【类型】健康科普 / 医疗科普公益短片（非叙事、非氛围片，目标是让观众看懂并照做）\n【画面风格】干净、专业、温和的 2D 医疗科普动画\n【语言环境】中国大陆普通社区\n【受众】普通家庭、儿童家长、宠物接触人群、社区居民\n【整体时长】约 115–140 秒（软目标；本版信息量更大，请自然展开成 8–10 个分镜 / 段落，每段承载一个清晰主信息 + 至多一个\"为什么\"；段数与每段拍数由你按信息密度决定，不要凑时长也不要硬塞，但也不要把一个要点和它的\"为什么\"硬挤进同一格导致画面拥挤）\n\n【核心科普信息（必须忠实保留，不许增删医学结论、不许改顺序；下面每个 ◆ 建议各自成段）】\n\n总纲：被猫狗抓伤或咬伤后，按\"一冲、二消、三就医、四打针\"四步走；其中冲洗最关键、越早越好。\n\n◆ 第一步·冲洗（为什么最关键）：被抓咬后第一件事不是止血、不是涂药，而是冲洗伤口——及时冲洗能冲掉大部分病毒，是救命的关键，越早做越好。\n◆ 冲洗·用什么：首选肥皂水 + 流动清水（自来水即可）交替冲；绝对不要用白酒、醋、牙膏、草药——这些没用，还会刺激伤口、加重感染风险。\n◆ 冲洗·三个要点：① 时间够——至少冲 15 分钟，别冲两下就停；② 冲彻底——把伤口完全露出，肥皂水和清水交替冲，边冲边从靠近心脏的一侧向外轻轻挤压伤口周围，把脏血污物挤出；③ 别乱做——严禁用嘴吸伤口（会让施救者也感染），也别紧紧包扎或缝合（大出血除外），让伤口敞开透气、反而不容易滋生病毒。\n◆ 第二步·消毒：冲够 15 分钟后，用干净纱布或纸巾轻轻蘸干，再用碘伏擦伤口及周围约 5 厘米皮肤；破损伤口不要用高浓度酒精——太疼，还会损伤组织。消毒后用无菌纱布宽松盖一下、别缠太紧，保持透气。\n◆ 第三步·就医：伤口处理好后，24 小时内尽快去医院犬伤门诊；越早打疫苗，保护效果越好；即使超过 24 小时，只要还没发病，打了仍然有用。\n◆ 第四步·打针：按医嘱完成狂犬病疫苗接种，必要时配合狂犬病免疫球蛋白。记住——伤口处理和疫苗\"两层防护缺一不可\"，而伤口冲洗消毒是第一道防线、优先级更高。\n\n【四个高危误区（最容易出事，必须破除；建议拆成 1–2 段，每条用无字符号画面，绝不做成写字卡片）】\n◆ 误区1：自家猫狗打过疫苗，伤人就不用处理——错。动物疫苗保护率不是 100%，仍有带毒风险，只要破皮就必须冲洗消毒 + 打疫苗。\n◆ 误区2：伤口小、没出血就不用打针——错。表皮破了哪怕不流血，也可能有肉眼看不见的伤口让病毒钻入，二级暴露必须打疫苗。\n◆ 误区3：伤口愈合了就不用打疫苗——错。狂犬病潜伏期可达几天到几年，没发病前打疫苗都有用，别拖。\n◆ 误区4：打了疫苗就万事大吉、不用管伤口——错。伤口冲洗消毒是第一道防线、优先级比疫苗还高，二者缺一不可。\n\n【收尾】狂犬病病死率接近 100%、可防不可治，别存任何侥幸心理；被抓咬后按\"一冲、二消、三就医、四打针\"四步走，就能最大程度保护自己。\n\n【基调弧】开头略带紧张（提示风险）→ 中段冷静、专业、可信、一步步演示 → 结尾明确、温暖、有行动号召。\n\n【硬约束】\n  - 不要血腥、恐怖、惊悚画面；伤口一律用极浅的中性示意线条（淡淡一道即可）表示，禁止红色 / 血色 / 淋漓的伤口，禁止任何伤口特写；冲洗 / 挤压 / 消毒一律温和、符号化。\n  - 不要出现品牌名、医院名、药品商品名（碘伏、酒精、疫苗等以通用无商标物品形象表现）、平台名、单位名、个人姓名；不要出现任何 LOGO、水印、角标；盾牌等符号上的医疗十字保持极简，不得画成接近真实机构徽标的样式。\n  - 画面内不要出现任何文字 / 字母 / 数字（包括\"15 分钟\"\"5 厘米\"\"24 小时\"\"一冲二消三就医四打针\"等）——全部交给旁白和画面下方的中文字幕承载，画面只用形象 / 图标 / 符号（如：沙漏表示时长，从心脏侧向外的箭头表示挤压方向，✓ 叠在正确做法上，✗ 叠在错误做法上）。\n  - 【✗/✓ 语义铁律，最高优先级】✓ 只叠在正确做法上、✗ 只叠在明确的错误物品或错误想法上；**任何正确步骤（冲洗 / 消毒 / 就医 / 打针）在全片任何画面都绝不能被 ✗ 否定**；同一镜内 ✓/✗ 的含义不得前后反转、不得自相矛盾。\n  - 误区4（打了疫苗 ≠ 不用管伤口）必须用**正向**画面表达：画\"伤口冲洗消毒\"与\"疫苗\"两层防护盾、各配 ✓、强调二者缺一不可且冲洗消毒优先级更高；只有\"以为只打一针就够、不处理伤口\"这种错误想法才打 ✗，并画出\"只做一项 → 盾牌有缺口 → 防护失败\"的语义，绝不给冲洗 / 消毒 / 疫苗这些正确步骤本身打 ✗。\n  - 错误 / 禁忌做法（白酒 / 醋 / 牙膏 / 草药 / 用嘴吸 / 高浓度酒精 / 紧紧缠绕）一律用\"物品形象 + ✗\"否定，绝不演示成可被误学的正确步骤。\n  - \"大出血需例外（先按压止血、尽快就医）\"用明确的**正向**小图示（手按压 → 就医箭头）表达，并与上面的禁忌 ✗ 区在画面上分隔开，不要并排放进禁忌区、以免被误读成又一条禁忌。\n  - 演示的先后顺序要可读：冲洗作为最关键、最早的一步，在画面上要明显处于\"第一 / 最先\"的位置（如序号、时间轴箭头）；不要把冲洗 / 消毒 / 打针三步用并列等权的方式堆在一起而弱化\"先冲洗\"。\n  - 误区不要做成写字卡片，而是用无字符号画面（如：乖巧的狗 + ✗、极小的伤口 + ✗、已愈合的疤 + ✗）。\n  - 所有医学解释简洁易懂；画面下方预留中文字幕空间；人物、画风、色调、场景全片保持连续一致。",
    prompt_en:"A health-education PSA. After a cat or dog bite or scratch, don't count on luck and don't delay: (1) immediately rinse the wound thoroughly under running water with soap, (2) get to a clinic as soon as possible, (3) let a doctor assess the exposure risk, and (4) complete rabies post-exposure prophylaxis as directed — the vaccine, plus immunoglobulin if needed. Clean, gentle, professional 2D medical-explainer animation (flat, clear shapes, soft blue-green palette, symbolic — no gore, no on-screen text), Chinese narration, Chinese subtitles, and foley.",
    src:"videos/psa.mp4", poster:"posters/psa.jpg",
    io:{in:"Instruction + source text", out:["Multi-shot dynamic video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"tortoise", title:"The Tortoise and the Hare",
    genre:"Storybook · Fable", cat:"Storybook",
    prompt:"Make a gentle illustrated children's bedtime picture book of the classic fable 'The Tortoise and the Hare'. Tell it page by page — one warm, simple read-aloud line per page — in a soft watercolor storybook style, narrated aloud for a young child, with the read-along words shown on screen.",
    src:"videos/tortoise.mp4", poster:"posters/tortoise.jpg",
    io:{in:"Instruction only", out:["Image-sequence / storybook video","Speech / voice-over audio","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"ugly_duckling", title:"The Ugly Duckling",
    genre:"Storybook · Classic Fairy Tale", cat:"Storybook",
    prompt:"做一条 90 秒左右的经典童话绘本视频(有声绘本、可跟读)。改编安徒生《丑小鸭》,忠于经典情节:一只又大又灰的小鸭子出生后被同伴和农场动物嫌弃、嘲笑、欺负,孤单熬过寒冷的冬天;春天来临,它在湖边看到美丽的天鹅,自卑地靠近,却在水中倒影里发现自己也长成了一只天鹅。温柔的绘本插画风,温柔女声朗读,屏幕上有跟读文字。英文。",
    prompt_en:"A classic fairy-tale picture-book video (read-aloud, follow-along) adapting Andersen's 'The Ugly Duckling', faithful to the story: a big gray duckling is mocked and shunned by the farmyard, endures a lonely winter, and in spring shyly approaches the beautiful swans by the lake — only to see in his reflection that he has grown into a swan himself. Gentle storybook illustration style, a warm female narrator, read-along words on screen. English.",
    src:"videos/ugly_duckling.mp4", poster:"posters/ugly_duckling.jpg",
    io:{in:"Instruction only", out:["Image-sequence / storybook video","Speech / voice-over audio","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"orpheus", title:"Orpheus and Eurydice",
    genre:"Illustrated Audiobook · Myth", cat:"Storybook",
    prompt:"An illustrated audiobook of the myth of Orpheus and Eurydice: a narrator tells the whole story over a slideshow of painted illustrations, with Orpheus, Eurydice, and Hades each speaking their own lines of dialogue woven into the narration — a richer, multi-voice dramatic telling (not a one-line-per-page children's book). Gentle read-aloud English narration, English subtitles, and foley.",
    src:"videos/orpheus.mp4", poster:"posters/orpheus.jpg",
    io:{in:"Instruction only", out:["Image-sequence / storybook video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"poem_recital", title:"Hope Is the Thing with Feathers",
    genre:"Audio-driven · Illustrated Poem", cat:"Narrative", pipeline:"storybook",
    prompt:"我会上传我自己录好的约 35 秒英文诗朗诵音频(只有人声)。帮我按诗的意境生成一条同步的画面短片,用我的原声做旁白、画面随情绪推进,可叠加轻量环境声。横屏,配英文字幕。",
    prompt_en:"An audio-driven illustrated poem: the user supplies their OWN spoken-word recitation, and the visuals — a slideshow of painted illustrations — are timed to that real recording, advancing with the poem's mood, with English subtitles and light foley. The user's own voice is the narration (no re-synthesis). Here: Emily Dickinson's 'Hope is the thing with feathers'.",
    src:"videos/poem_recital.mp4", poster:"posters/poem_recital.jpg",
    io:{in:"Instruction + audio asset", out:["Image-sequence / storybook video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"video_extend", title:"Extended Ending",
    genre:"Refine existing footage · Video extension", cat:"Refine",
    prompt:"我有一段 2D 动画短片的结尾片段(雨夜地铁车厢里的场景),结尾断得有点突然。帮我顺着它的最后一帧、在完全一致的动画画风和这节车厢场景里,自然续接大约 5 秒的氛围收尾——镜头缓慢推进、车厢灯光与车窗雨痕轻轻晃动、光线渐暗并轻微渐隐,让结尾更有余韵。前面已有的画面一帧都别动、别重剪,只在末尾接上这段延长。",
    prompt_en:"Take an existing short clip whose ending stops too abruptly and extend it — continuing naturally from its final frame in the same style and scene for a few more seconds of atmospheric outro (slow push-in, gentle fade), without touching or re-cutting the original footage. Here: the closing shot of a 2D-anime late-night subway scene, extended into the now-empty carriage.",
    src:"videos/video_extend.mp4", poster:"posters/video_extend.jpg",
    io:{in:"Instruction + video asset", out:["Refined existing video","Music / Foley / sound effects","Final audiovisual composition"]},
  },
  {
    key:"space_blockade", title:"Running the Blockade",
    genre:"Spectacle · Space Fleet Chase", cat:"Spectacle",
    prompt:"做一条 60 秒左右的太空大战 spectacle:一架小型战机在敌方巨舰封锁线之间高速穿梭求生。所有镜头都在飞船外的太空,不要机舱内戏、不要主角面部特写——战机只是衬托巨舰尺度的\"参照物\",真正的主角是壮观的巨舰和战斗场面。运镜紧贴战机高速跟拍、在巨舰之间俯冲穿梭、再大幅拉远展现尺度。明亮高调色的科幻质感。无对白,只要引擎/战斗音效,不要字幕。",
    prompt_en:"A one-minute space-battle spectacle: a lone starfighter threads at full burn between the capital ships of an enemy blockade, running for its life. Every shot stays out in open space — no cockpit interiors, no pilot close-ups; the tiny fighter is only a scale reference against the hulking warships, which are the real protagonists along with the battle itself. The camera chases tight on the fighter's tail, dives and weaves between the giant hulls, then pulls far back to reveal the sheer scale of the fleet. Bright, high-key sci-fi look. No dialogue — engine roar and battle sound effects only, no subtitles.",
    src:"videos/space_blockade.mp4", poster:"posters/space_blockade.jpg",
    io:{in:"Instruction only", out:["Multi-shot dynamic video","Music / Foley / sound effects","Final audiovisual composition"]},
  },
];

// which films appear in the Home "Featured films" row (keys, visually diverse)
const FEATURED = ["sorting_hat","luchen","sherlock"];

// fake "generation" overlay length, ms (0 = jump straight to playback)
const FAKE_GENERATE_MS = 2600;

// The plan the Director composes depends on the input/goal — different film TYPES
// run different agent chains (grounded in the real agent registry, agents/__init__.py):
//   cinematic  = Story → Keyframe Sheet → Shot Prompt → Clip(Seedance) → Audio+Compositor
//   adaptation = Adaptation → Keyframe Sheet → Shot Prompt → Clip → Audio+Compositor
//               (same downstream as cinematic — AdaptationAgent is its own registered brain,
//               grounding shots in an EXISTING story rather than authoring one from scratch)
//   explainer  = Explainer → Keyframe Sheet → Shot Prompt → Clip → Narration+Compositor
//   storybook  = Narration → Illustration → Narrator → Compositor  (no Seedance clips; the old
//               "Storybook" agent was retired and merged into IllustratedStoryAgent, agent_id
//               NarrationAgent — see agents/illustrated_story/descriptor.py)
//   refine     = Video Intake → Video Extend (no Story/Keyframe/Clip — grounded in an existing
//               clip's last frame, per evals/director_routing/eval_cases.json's "extend_*" cases)
//   spectacle  = Travelogue → Keyframe Sheet → Shot Prompt → Clip (the camera IS the protagonist;
//               no dialogue / subtitles / VO, so the plan ends at Clip — Seedance native foley +
//               ClipAgent's own ffmpeg assembly. Chain is the ACTUAL route the Director planned
//               for space_blockade: TravelogueAgent → KeyframeSheetAgent → ShotPromptAgent → ClipAgent)
const STAGE_SETS = {
  cinematic: [
    "Director · planning this pipeline",
    "Story · characters, world & beats",
    "Keyframe Sheet · identity anchors & storyboards",
    "Shot Prompt · cinematic per-shot direction",
    "Clip · rendering shots (Seedance 2.0, native foley)",
    "Audio + Compositor · voice, score, mix & final cut",
  ],
  adaptation: [
    "Director · planning this pipeline",
    "Adaptation · grounding the source story in shot-ready beats",
    "Keyframe Sheet · identity anchors & storyboards",
    "Shot Prompt · cinematic per-shot direction",
    "Clip · rendering shots (Seedance 2.0, native foley)",
    "Audio + Compositor · voice, score, mix & final cut",
  ],
  explainer: [
    "Director · planning this pipeline",
    "Explainer · grounded script & shot plan",
    "Keyframe Sheet · style anchors & storyboards",
    "Shot Prompt · per-shot direction",
    "Clip · rendering shots (Seedance 2.0)",
    "Narration + Compositor · scripted voice-over, subtitles & cut",
  ],
  storybook: [
    "Director · planning this pipeline",
    "Narration · illustrated story script",
    "Illustration · watercolor picture-book pages",
    "Narrator · read-aloud voice-over",
    "Compositor · slideshow, read-along captions & mix",
  ],
  refine: [
    "Director · planning this pipeline",
    "Video Intake · reading the source clip",
    "Video Extend · extracting the last frame & generating a continuation (Seedance 2.0, native foley)",
  ],
  spectacle: [
    "Director · planning this pipeline",
    "Travelogue · visual journey — beats where the camera is the protagonist",
    "Keyframe Sheet · craft & fleet identity anchors, storyboards",
    "Shot Prompt · per-shot camera moves & choreography",
    "Clip · rendering shots (Seedance 2.0, native foley) & final assembly",
  ],
};
function stagesFor(d){
  // pipeline (how it's actually produced) is independent of cat (which topic cluster it's filed
  // under) — most films' pipeline matches their cat, but a few don't (e.g. poem_recital is
  // cat:"Narrative" for filtering, but its real agent chain is the storybook one).
  const kind = d && (d.pipeline || d.cat);
  if (kind === "storybook" || kind === "Storybook") return STAGE_SETS.storybook;
  if (kind === "explainer" || kind === "Explainer") return STAGE_SETS.explainer;
  if (kind === "refine" || kind === "Refine") return STAGE_SETS.refine;
  if (kind === "adaptation" || kind === "Adaptation") return STAGE_SETS.adaptation;
  if (kind === "spectacle" || kind === "Spectacle") return STAGE_SETS.spectacle;
  return STAGE_SETS.cinematic;
}
/* ============================================================================= */

const PLAY_SVG  = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
const ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const $ = (id)=>document.getElementById(id);
const byKey = (k)=>DEMOS.find(d=>d.key===k);
const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------------------------------------------------------- generation */
let genTimers = [];
function clearGenTimers(){ genTimers.forEach(clearTimeout); genTimers = []; }

function ensureGenOverlay(){
  if ($("gen")) return;
  const el = document.createElement("div");
  el.className = "gen"; el.id = "gen"; el.setAttribute("aria-hidden","true");
  el.innerHTML = `
    <div class="gen-card">
      <div class="glow"></div>
      <div class="gen-h"><span class="spinner"></span><span>Directing your film…</span></div>
      <div class="gen-sub" id="genSub">Reading your intent…</div>
      <div class="bar"><i id="barFill"></i></div>
      <ul class="stages" id="stages"></ul>
      <div class="gen-note">This is the plan the Director composed for this prompt — different inputs get a different plan and crew.</div>
    </div>`;
  document.body.appendChild(el);
}

function runGeneration(stages, done){
  ensureGenOverlay();
  if (FAKE_GENERATE_MS <= 0){ done(); return; }
  const gen = $("gen"), barFill = $("barFill"), genSub = $("genSub"), stagesEl = $("stages");
  // rebuild the stage list for THIS film's plan (varies by film type)
  stagesEl.innerHTML = stages.map(s=>`<li><span class="tick">${CHECK_SVG}</span><span>${s}</span></li>`).join("");
  const stageItems = [...stagesEl.children];
  gen.classList.add("on"); gen.setAttribute("aria-hidden","false");
  barFill.style.width = "0%";
  genSub.textContent = "Reading your intent…";
  const n = stageItems.length, step = FAKE_GENERATE_MS / n;
  for (let k=0;k<n;k++){
    genTimers.push(setTimeout(()=>{
      stageItems.forEach((li,idx)=>{ li.classList.toggle("done", idx<k); li.classList.toggle("active", idx===k); });
      genSub.textContent = stages[k];
      barFill.style.width = Math.round(((k+1)/n)*100) + "%";
    }, Math.round(step*k)));
  }
  genTimers.push(setTimeout(()=>{
    stageItems.forEach(li=>{li.classList.remove("active");li.classList.add("done");});
    barFill.style.width = "100%"; genSub.textContent = "Done — rolling film";
  }, FAKE_GENERATE_MS - 120));
  genTimers.push(setTimeout(()=>{
    gen.classList.remove("on"); gen.setAttribute("aria-hidden","true"); done();
  }, FAKE_GENERATE_MS));
}

/* ------------------------------------------------------------------- portfolio */
function ioRow(d){
  if (!d.io) return "";
  const outChips = d.io.out.map(o=>`<span class="io-chip io-out">${esc(o)}</span>`).join("");
  return `
    <div class="io-row">
      <span class="io-chip io-in">${esc(d.io.in)}</span>${outChips}
    </div>`;
}

function filmCard(d){
  return `
    <button class="film-card" data-key="${d.key}" aria-label="Generate: ${esc(d.title)}">
      <div class="ph" style="background-image:url('${d.poster}')">
        <span class="cat">${esc(d.cat)}</span>
        <span class="play-fab">${PLAY_SVG}</span>
      </div>
      <div class="body">
        <div class="ttl">${esc(d.title)}</div>
        <div class="desc">${esc(d.prompt)}</div>
        ${ioRow(d)}
        <div class="go">Generate this film ${ARROW_SVG}</div>
      </div>
    </button>`;
}

function initPortfolio(){
  const grid = $("grid"), filtersEl = $("filters");
  const player = $("player"), video = $("video");
  if (!grid) return;

  // filters
  const cats = ["All", ...[...new Set(DEMOS.map(d=>d.cat))]];
  let active = "All";
  filtersEl.innerHTML = cats.map((c,i)=>
    `<button class="pill${i===0?' active':''}" data-cat="${c}">${esc(c)}</button>`).join("");
  filtersEl.addEventListener("click", e=>{
    const b = e.target.closest(".pill"); if(!b) return;
    active = b.dataset.cat;
    [...filtersEl.children].forEach(p=>p.classList.toggle("active", p.dataset.cat===active));
    renderGrid();
  });
  function renderGrid(){
    const list = active==="All" ? DEMOS : DEMOS.filter(d=>d.cat===active);
    grid.innerHTML = list.map(filmCard).join("");
  }
  renderGrid();

  grid.addEventListener("click", e=>{
    const b = e.target.closest(".film-card"); if(!b) return;
    play(b.dataset.key);
  });

  function showList(on){
    $("portfolio-head").style.display = on ? "" : "none";
    filtersEl.style.display = on ? "" : "none";
    grid.style.display = on ? "" : "none";
    player.classList.toggle("on", !on);
  }
  function play(key){
    const d = byKey(key); if(!d) return;
    runGeneration(stagesFor(d), ()=>{
      $("pgenre").textContent = d.genre;
      $("ptitle").textContent = d.title;
      // Verbatim reproducibility: d.prompt IS the exact user instruction fed
      // to the pipeline (Chinese where the real input was Chinese); d.prompt_en
      // is a reference translation only.
      $("pprompt").textContent = d.prompt;
      const _pen = $("pprompt-en");
      if (_pen) {
        _pen.style.display = d.prompt_en ? "" : "none";
        _pen.textContent = d.prompt_en
          ? "English translation (reference only — the verbatim input above is what was fed): " + d.prompt_en
          : "";
      }
      video.src = d.src; video.poster = d.poster; video.muted = false;
      showList(false);
      window.scrollTo({top:0, behavior:"smooth"});
      video.load();
      const p = video.play(); if (p && p.catch) p.catch(()=>{});
    });
  }
  function back(){
    clearGenTimers();
    video.pause(); video.removeAttribute("src"); video.load();
    showList(true);
    window.scrollTo({top:0, behavior:"smooth"});
  }
  $("back").addEventListener("click", back);
  $("replay").addEventListener("click", ()=>{ video.currentTime=0; video.play(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && player.classList.contains("on")) back(); });

  // deep-link from Home: films.html?play=<key>
  const want = new URLSearchParams(location.search).get("play");
  if (want && byKey(want)) play(want);
}

/* -------------------------------------------------------------------- home */
function initHome(){
  const wrap = $("featured"); if (!wrap) return;
  wrap.innerHTML = FEATURED.map(k=>byKey(k)).filter(Boolean).map(d=>`
    <a class="work-card" href="films.html?play=${d.key}" aria-label="${esc(d.title)}">
      <div class="ph" style="background-image:url('${d.poster}')">
        <span class="play-fab">${PLAY_SVG}</span>
        <div class="meta"><span class="cat">${esc(d.cat)}</span><div class="ttl">${esc(d.title)}</div></div>
      </div>
    </a>`).join("");
}

/* -------------------------------------------------------------------- boot */
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.dataset.page;
  if (page === "home") initHome();
  if (page === "films") initPortfolio();
});
