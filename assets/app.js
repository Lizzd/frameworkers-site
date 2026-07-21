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
    prompt:"健康科普公益短片：《被猫狗咬伤后，别赌运气》\n\n【类型】健康科普 / 医疗科普公益短片（非叙事、非氛围片，目标是让观众看懂并照做）\n【画面风格】干净、专业、温和的 2D 医疗科普动画\n【语言环境】中国大陆普通社区\n【受众】普通家庭、儿童家长、宠物接触人群、社区居民\n【整体时长】约 85 秒左右（软目标；具体收成几段、每段几拍由你按信息密度决定，不要凑时长，也不要硬塞）\n\n【核心科普信息（必须忠实保留，不许增删医学结论、不许改顺序）】\n被猫狗咬伤或抓伤后，不要侥幸、不要拖延。正确做法依次是：\n1. 立刻用流动清水 + 肥皂水充分冲洗伤口（是“充分清洗”，不是冲一下）；\n2. 尽快到正规医疗机构就诊；\n3. 由医生评估暴露风险（按咬伤 / 抓伤 / 唾液接触伤口或黏膜等情况判断）；\n4. 按医嘱完成狂犬病暴露后预防——包括接种狂犬病疫苗，必要时使用狂犬病免疫球蛋白。\n\n【基调弧】开头略带紧张（提示风险）→ 中段冷静、专业、可信 → 结尾明确、温暖、有行动号召。\n\n【要传达到的内容点（这是“要讲清的东西”，不是固定分镜，请你自行归并、排序、决定哪些合成一段的多个 beat）】\n- 开场事件：社区公园里孩子想摸家养狗，被轻微咬伤/抓伤，家长立刻上前查看（轻微紧张，绝不血腥）。\n- 抛出关键：被咬后真正危险的不一定是伤口本身，关键是第一时间有没有做对。\n- 第一步冲洗：家长带孩子到水池，用流动清水冲，再配合肥皂水充分清洗。\n- 为什么冲洗：用符号化动画表达“冲洗能尽快减少伤口中的病毒风险”（不是真实血腥的伤口特写）。\n- 第二步就医：家长带孩子去干净、通用的门诊（不是某家具体医院）。\n- 医生评估：医生查看伤口，根据咬伤/抓伤/唾液接触等评估暴露风险——强调“别自己判断，让医生评估”。\n- 暴露后预防：规范流程——伤口处理 → 接种疫苗 →（必要时）免疫球蛋白；疫苗= 保护身体的盾。\n- 破侥幸：伤口小不等于没风险；动物看起来正常也不等于绝对安全；拖几天再说会错过最佳时机。（用符号化方式表达，不要做成大段文字卡片）\n- 收尾：孩子和家长安心离开门诊，阳光温暖；落在“狂犬病可防、不可赌，被咬后请立即处理”的行动号召上。\n\n【硬约束】\n- 不要血腥、恐怖、惊悚画面。\n- 不要出现品牌名、医院名、药品商品名、平台名、单位名称、个人姓名。\n- 不要出现任何 LOGO、水印、角标。\n- 画面内不要出现任何文字、字母、数字（包括误区卡片上的字）——所有文字信息一律交给旁白和画面下方的中文字幕承载，画面只用形象/图标/符号表达。\n- 误区不要做成写字的卡片，而是用无字的符号画面表达（例如一道很小的伤口配一个柔和的 ✗、一只看起来乖巧正常的狗配一个 ✗、一只走动的时钟配一个 ✗）。\n- 所有医学解释简洁易懂。画面下方预留中文字幕空间。\n- 人物、画风、色调、场景在全片保持连续一致。",
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
    prompt:"我会上传我自己录好的约 60 秒英文诗朗诵音频(只有人声)。帮我按诗的意境生成一条同步的画面短片,用我的原声做旁白、画面随情绪推进,可叠加轻量环境声。横屏,配英文字幕。",
    prompt_en:"An audio-driven illustrated poem: the user supplies their OWN spoken-word recitation, and the visuals — a slideshow of painted illustrations — are timed to that real recording, advancing with the poem's mood, with English subtitles and light foley. The user's own voice is the narration (no re-synthesis). Here: Emily Dickinson's 'Hope is the thing with feathers'. (Note: the goal text estimated ~60s, but the recording actually supplied — archived below — runs ~35s; the film follows the real audio.)",
    src:"videos/poem_recital.mp4", poster:"posters/poem_recital.jpg",
    inputs:["user_recitation.wav"],
    io:{in:"Instruction + audio asset", out:["Image-sequence / storybook video","Speech / voice-over audio","Music / Foley / sound effects","Subtitles","Final audiovisual composition"]},
  },
  {
    key:"video_extend", title:"Extended Ending",
    genre:"Refine existing footage · Video extension", cat:"Refine",
    prompt:"我有一段 2D 动画短片的结尾(雨夜地铁车厢内的画面),结尾断得有点突然。帮我顺着它的最后一帧、在完全一致的动画画风和这节地铁车厢场景里自然续接大约 5 秒的氛围收尾——镜头极缓慢推进、车窗上的雨痕和车厢灯光轻轻晃动、光线渐暗并轻微渐隐,保持和前面一模一样的画风与这处车厢场景,不要出现任何新的地点、人物或题材。",
    prompt_en:"Take an existing short clip whose ending stops too abruptly and extend it — continuing naturally from its final frame in the same style and scene for a few more seconds of atmospheric outro (slow push-in, gentle fade), without touching or re-cutting the original footage. Here: the closing shot of a 2D-anime late-night subway scene, extended into the now-empty carriage.",
    src:"videos/video_extend.mp4", poster:"posters/video_extend.jpg",
    inputs:["last_train_tail15.mp4"],
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
  {
    key:"ember_oak", title:"The Morning Ritual",
    genre:"Brand Ad \u00b7 Specialty Coffee", cat:"Advertisement",
    prompt:"做一条 30 秒左右的精品手冲咖啡品牌广告。诉求是卖\"清晨的仪式感\"和那份从容,不讲参数功能,让人看完想给自己慢慢冲一杯。温暖、慢节奏的质感生活方式调性。我会提供产品包装图和 logo,保持品牌一致。英文,不要旁白,可有一句简短 slogan 字幕。",
    prompt_en:"A ~30s specialty pour-over coffee brand ad. It sells the morning ritual and that sense of unhurried calm \u2014 no specs, no features \u2014 so that after watching you want to slowly brew yourself a cup. Warm, slow-paced, quality-lifestyle tone. The user supplies the product packaging image and logo; brand identity must stay consistent. English, no voice-over; a single short slogan subtitle is allowed.",
    src:"videos/ember_oak.mp4", poster:"posters/ember_oak.jpg",
    inputs:["ember_oak_packaging.png","ember_oak_logo.png"],
    io:{in:"Instruction + reference images", out:["Multi-shot dynamic video","Music / Foley / sound effects","Final audiovisual composition"]},
  },
  {
    key:"kurve", title:"The Champion's Curve",
    genre:"Product Launch Ad \u00b7 Coffee Machine", cat:"Advertisement", pipeline:"advertisement_vo",
    prompt:"做一条 20 秒左右的家用手冲咖啡机新品广告,核心诉求是把'一键复刻冠军手冲曲线'这个卖点讲清楚。我会提供这台机器的三张产品图(正面、侧面、出水特写)和我们的品牌 logo,机器外观、配色和 logo 必须严格保持一致,不能让模型自由发挥改造型。文案我也写好了一段,广告里的卖点措辞和结尾那句 slogan 都按我给的来、别改词。质感要温暖、精致、有生活气息的产品广告调性,慢镜头注水、热气升腾那种。结尾落在产品 + logo + slogan 字幕。音频要注水声、咖啡滴落的 foley 加一点轻柔背景乐,再配温暖沉稳的英文旁白把我的文案念出来;旁白不要烧字幕,屏幕文字只留结尾那句 slogan。\n\n文案如下(逐字):\nEvery champion pour has a signature — temperature, flow, rhythm. KURVE remembers it. One touch, and the championship curve pours again.\n结尾 slogan:KURVE. One touch. Champion's pour.",
    prompt_en:"A ~20s launch ad for a home pour-over coffee machine; the one claim to land: 'one touch replays the championship pour curve'. The user supplies three product photos (front / side / pour close-up) and the brand logo \u2014 the machine's design, colors and logo must stay strictly consistent, no redesigning. The user also wrote the copy: selling-point wording and the closing slogan must be used verbatim. Warm, refined, lived-in product-ad texture \u2014 slow-motion pours, rising steam. End on product + logo + slogan card. Audio: pouring-water and coffee-drip foley plus soft background music, with a warm, steady English voice-over reading the copy; the VO gets no subtitles \u2014 the only on-screen text is the closing slogan. Copy (verbatim): 'Every champion pour has a signature \u2014 temperature, flow, rhythm. KURVE remembers it. One touch, and the championship curve pours again.' Slogan: 'KURVE. One touch. Champion's pour.'",
    src:"videos/kurve.mp4", poster:"posters/kurve.jpg",
    inputs:["kurve_front.png","kurve_side.png","kurve_pour_closeup.png","kurve_logo.png"],
    io:{in:"Instruction + script + reference images", out:["Multi-shot dynamic video","Scripted English voice-over","Foley / sound effects & audio mix","Final audiovisual composition"]},
  },
  {
    key:"octopus", title:"Strange Nature: The Octopus",
    genre:"Visualized Podcast \u00b7 Audio-driven", cat:"Explainer", pipeline:"podcast_audio",
    prompt:"我会提供一期播客的音频 + 对应文字稿。帮我做成一条可视化播客短片(主持人形象保持一致 + 要点字幕卡),用我的原音频不要重配,英文字幕。\n\n文字稿如下(逐字):\nWelcome back to Strange Nature — I'm your host, and today: the octopus.\n\nAn octopus has three hearts. Two pump blood through the gills, and one drives it around the body. That blood runs blue, because it carries oxygen with copper instead of iron.\n\nOf its roughly five hundred million neurons, nearly two thirds live not in its head, but in its arms — each arm tastes, touches, and partly decides on its own.\n\nAnd here's the strangest part: an octopus is functionally colorblind. Yet it can match the color and texture of coral, sand, or stone in under a second, using thousands of pigment cells in its skin called chromatophores.\n\nSome scientists call it the closest thing we have to alien intelligence. Maybe intelligence doesn't need a spine at all.",
    prompt_en:"A visualized podcast: the user supplies one episode's audio plus its transcript; the system builds an illustrated short with a consistent host figure and key-point visuals, keeps the ORIGINAL audio untouched (no re-dub), and burns English subtitles. Episode: 'Strange Nature \u2014 The Octopus' (three hearts, copper-based blue blood, arm-distributed neurons, colorblind camouflage). (The 'user recording' is a synthesized 59s host read standing in for a real one \u2014 archived below, so the exact same input reproduces the experiment.)",
    src:"videos/octopus.mp4", poster:"posters/octopus.jpg",
    inputs:["podcast_audio.wav"],
    io:{in:"Instruction + script + audio asset", out:["Image-sequence / storybook video","Original user audio (passed through)","Subtitles","Final audiovisual composition"]},
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
    "Illustrated Story · pages, panels & read-aloud script",
    "Illustration · watercolor picture-book pages",
    "Voice · read-aloud narration (TTS)",
    "Compositor · slideshow, read-along captions & mix",
  ],
  refine: [
    "Director · planning this pipeline",
    "Video Intake · reading the source clip",
    "Video Extend · extracting the last frame & generating a continuation (Seedance 2.0, native foley)",
  ],
  advertisement: [
    "Director \u00b7 planning this pipeline",
    "Image Intake \u00b7 reading the supplied brand materials (packaging, logo)",
    "Brief Enricher \u00b7 classifying materials into typed references",
    "Advertisement \u00b7 pitch beats & product-centric shot plan",
    "Keyframe Sheet \u00b7 brand-locked anchors & storyboards",
    "Shot Prompt \u00b7 per-shot direction",
    "Clip \u00b7 rendering shots (Seedance 2.0, native foley) & final assembly",
  ],
  podcast_audio: [
    "Director \u00b7 planning this pipeline",
    "Audio Intake \u00b7 reading the supplied recording (speech, English)",
    "Transcription \u00b7 verbatim transcript with timings",
    "Illustrated Story \u00b7 host & key-point pages from the transcript",
    "Illustration \u00b7 character-anchored pages (consistent host)",
    "Voice \u00b7 the user's own recording, passed through untouched",
    "Audio Mix + Compositor \u00b7 slideshow timed to the real audio, English subtitles",
  ],
  advertisement_vo: [
    "Director \u00b7 planning this pipeline",
    "Image Intake \u00b7 reading the supplied product photos & logo",
    "Brief Enricher \u00b7 classifying materials into typed references",
    "Advertisement \u00b7 pitch beats, VO script & product-centric shot plan",
    "Keyframe Sheet \u00b7 brand-locked anchors & storyboards",
    "Shot Prompt \u00b7 per-shot direction",
    "Clip \u00b7 rendering shots (Seedance 2.0, native foley)",
    "Voiceover + Audio Mix \u00b7 scripted English VO over foley",
    "Compositor \u00b7 slogan end-card & final cut",
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
  if (kind === "podcast_audio") return STAGE_SETS.podcast_audio;
  if (kind === "advertisement_vo") return STAGE_SETS.advertisement_vo;
  if (kind === "advertisement" || kind === "Advertisement") return STAGE_SETS.advertisement;
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
      // Input materials strip — the EXACT files fed to the pipeline, served
      // from inputs/<key>/ (reproducibility archive; goal.txt = the prompt above).
      const _pin = $("pinputs"), _pinList = $("pinputs-list");
      if (_pin && _pinList) {
        const files = d.inputs || [];
        _pin.style.display = files.length ? "" : "none";
        _pinList.innerHTML = files.map(f => {
          const url = "inputs/" + d.key + "/" + f;
          const ext = f.split(".").pop().toLowerCase();
          let media;
          if (["png","jpg","jpeg","webp","gif"].includes(ext))
            media = `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(f)}" loading="lazy"></a>`;
          else if (["wav","mp3","m4a","ogg"].includes(ext))
            media = `<audio controls preload="none" src="${url}"></audio>`;
          else if (["mp4","mov","webm"].includes(ext))
            media = `<video controls preload="metadata" src="${url}"></video>`;
          else
            media = `<a class="pin-txt" href="${url}" target="_blank" rel="noopener">view file</a>`;
          return `<div class="pin-item">${media}<span class="pin-name">${esc(f)}</span></div>`;
        }).join("");
      }
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
