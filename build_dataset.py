import json
import re
import os

with open('raw_extracted_docs.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

# Traditional enriched titles and topics for Sai Satcharitra chapters
CHAPTER_METADATA = {
    1: {
        "title": "Salutations & The Story of Grinding Wheat",
        "subtitle": "Hemadpant's Salutations -- The Story of Grinding Wheat and Its Philosophical Significance.",
        "topics": ["Salutations to Ganesha, Saraswati, Gurus", "Story of Grinding Wheat", "Destroying the Cholera Epidemic", "Philosophical Meaning of the Two Stones & Handle"]
    },
    2: {
        "title": "Object of Writing the Work & Necessity of a Guru",
        "subtitle": "Object of Writing the Work -- Incapacity and Boldness -- Hot Discussion -- Significant Title -- Necessity of a Guru.",
        "topics": ["Incapacity and Boldness in Undertaking the Work", "Hot Discussion with Rohilla and Devotees", "Title 'Hemadpant' Conferred by Baba", "Necessity of a Guru"]
    },
    3: {
        "title": "Sai Baba's Sanction and Promise",
        "subtitle": "Baba's Assent to Writing the Work -- Assignment of Work to Devotees -- Baba's Stories as Beacon-Light.",
        "topics": ["Sai Baba's Complete Assent & Blessings", "Assignment of Duties to Devotees", "Baba's Assurance: 'Hold Me in Your Heart'", "Beacon-Light of Saints' Leelas"]
    },
    4: {
        "title": "Sai Baba's First Advent in Shirdi",
        "subtitle": "Mission of the Saints -- Shirdi a Holy Tirth -- Personality of Sai Baba -- Dictum of Goulibuva -- Sai Baba as an Incarnation.",
        "topics": ["Mission of the Saints", "Shirdi Made Holy by Baba's Presence", "Sai Baba's Striking Personality", "Goulibuva's Proclamation of Sai Baba's Divinity"]
    },
    5: {
        "title": "Baba's Return with Chand Patil's Marriage Party",
        "subtitle": "Baba's Return with Chand Patil's Marriage Party -- Welcomed and Addressed as 'Sai' -- Contact with Other Saints -- Dress and Daily Routine.",
        "topics": ["Story of Chand Patil's Lost Mare", "The Title 'Ya Sai' by Bhagat Mhalsapati", "Contact with Devidas and Gangagir", "Baba's Attire and Austerities"]
    },
    6: {
        "title": "Rama-Navami Festival and Masjid Repairs",
        "subtitle": "Efficacy of the Touch of Guru's Hand -- Rama-Navami Festival: Origin & Transformation -- Repairs to the Masjid.",
        "topics": ["Origin of Rama-Navami Utsav in 1897", "Gopalrao Gund's Offering", "Cradle & Sandalwood Paste Procession", "Repairing the Dilapidated Masjid (Dwarkamai)"]
    },
    7: {
        "title": "Wonderful Incarnation & Yogic Practices",
        "subtitle": "Wonderful Incarnation -- Behaviour of Sai Baba -- His Yogic Practices -- His All-Pervasiveness and Mercy.",
        "topics": ["Dhoti and Khanda Yoga Practices", "72-Hour Samadhi in 1886", "His Omnipresence and Compassion", "Curing Devotees Through Subtle Ways"]
    },
    8: {
        "title": "Importance of Human Birth & Begging of Food",
        "subtitle": "Importance of Human Birth -- Sai Baba Begging Food -- Bayajabai's Selfless Service -- Sai Baba's Dormitory.",
        "topics": ["Rare Gift of Human Birth", "Baba Begging Alms from Five Houses Daily", "Bayajabai's Motherly Devotion", "Sleeping in the Masjid with Mhalsapati and Tatya"]
    },
    9: {
        "title": "Effect of Compliance with Baba's Orders",
        "subtitle": "Effect of Compliance and Non-Compliance with Baba's Orders at the Time of Taking Leave -- Stories of Tarkhad, Kaka Mahajani, and Others.",
        "topics": ["Characteristic of Shirdi Pilgrimage", "Tarkhad's Son and Wife", "Compliance Brings Safety, Disobedience Brings Loss", "Baba's Loving Protection Over Distance"]
    },
    10: {
        "title": "Sai Baba's Mode of Life & Teachings",
        "subtitle": "Sai Baba's Mode of Life -- His Sleeping-Board -- His Stay in Shirdi -- His Teachings -- Humility.",
        "topics": ["The Suspended Wooden Plank Bed-Stead", "His Simple Lifestyle in the Masjid", "His Words of Wisdom", "Baba as the Servant of God"]
    },
    11: {
        "title": "Sai as Sagun Brahman & Control Over Elements",
        "subtitle": "Sai as Sagun (Manifest) Brahman -- Dr. Pandit's Worship -- Haji Sidik Falke -- Baba's Control Over Lightning and Storm.",
        "topics": ["Sagun vs Nirgun Worship", "Dr. Pandit's Triphala Worship on Baba's Forehead", "Haji Sidik Falke's Long Wait and Blessing", "Baba Calming the Storm and Rain"]
    },
    12: {
        "title": "Sai Leelas: Kaka Mahajani & Mule Shastri",
        "subtitle": "Experiences of (1) Kaka Mahajani -- (2) Dhumal Pleader -- (3) Mrs. Nimonkar -- (4) Mule Shastri of Nasik.",
        "topics": ["Kaka Mahajani's Obedience", "Dhumal Pleader's Cases Handled by Baba", "Mrs. Nimonkar's Motherly Care", "Mule Shastri's Vision of Gholap Swami in Baba"]
    },
    13: {
        "title": "Diseases Cured: Bhimaji Patil & Bala Shimpi",
        "subtitle": "More Sai Leelas -- Diseases Cured: (1) Bhimaji Patil -- (2) Bala Shimpi -- (3) Bapu Rao Booty -- (4) Alandi Swami.",
        "topics": ["Bhimaji Patil's Severe Tuberculosis Cured", "Bala Shimpi's Malarial Fever Dispersed to a Dog", "Bapu Rao Booty's Cholera Averted", "Alandi Swami's Earache Healed"]
    },
    14: {
        "title": "Ruttonji Wadia of Nanded & Saint Moulisaheb",
        "subtitle": "Ruttonji Wadia of Nanded -- Saint Moulisaheb -- Secret Dakshina and Blessing of a Son.",
        "topics": ["Ruttonji's Childlessness and Arrival at Shirdi", "Baba Accounts for Every Pie Given to Moulisaheb", "The Blessing of Progeny Fulfilled", "Unity of Saints"]
    },
    15: {
        "title": "Naradiya Kirtan & Cholkar's Sugarless Tea",
        "subtitle": "Naradiya Kirtan Paddhati -- Mr. Cholkar's Vow of Sugarless Tea -- Two Lizards Meeting.",
        "topics": ["Das Ganu's Kirtans Spreading Baba's Name", "Cholkar's Humble Vow Fulfilled in Shirdi", "Baba's Sweet Request: 'Add More Sugar!'", "The Story of the Two Rejoicing Lizards"]
    },
    16: {
        "title": "The Quest for Brahma-Jnana (Self-Realization)",
        "subtitle": "Story of a Rich Gentleman Seeking Brahma-Jnana -- Baba's Practical Lessons on Self-Realization.",
        "topics": ["A Rich Gentleman Desires Instant Enlightenment", "Baba Sends for Five Rupees Loan", "Greed and Clinging as Obstacles to Jnana", "Qualifications for Attaining Brahma-Jnana"]
    },
    17: {
        "title": "How Hemadpant was Accepted and Blessed",
        "subtitle": "Hemadpant's Arrival in Shirdi -- Baba's Acceptance -- Advice to Radhabai Deshmukh -- M. B. Rege's Experience.",
        "topics": ["Hemadpant's Complete Surrender to Baba", "Baba's Reassurance: 'Look to Me, and I Look to You'", "Radhabai Deshmukh's Fast unto Death Dissuaded", "The Power of Guru's Grace (Nishta & Saburi)"]
    },
    18: {
        "title": "Das Ganu's Problem Solved by Kaka's Maidservant",
        "subtitle": "Das Ganu's Difficulty with Ishavasya Upanishad -- Solved by Kaka Mahajani's Poor Maidservant Singing in Rags.",
        "topics": ["Das Ganu's Scholarly Dilemma on Ishavasya Upanishad", "Baba Directs Him to Vile Parle", "The Poor Maid Singing Joyfully in Torn Clothes", "Realizing that Contentment Transcends Wealth"]
    },
    19: {
        "title": "Stories of V. H. Thakur and Anantrao Patankar",
        "subtitle": "Baba's Guidance to (1) V.H. Thakur (Revenue Officer) -- (2) Anantrao Patankar (Parable of Nine Coins of Bhakti).",
        "topics": ["V. H. Thakur Guided to Appa Kulkarni and Shirdi", "Baba Recalls Meeting Him in Kanchangad", "Anantrao Patankar's Restless Mind", "The Parable of the Mare Dropping Nine Balls of Dung (Navavidha Bhakti)"]
    },
    20: {
        "title": "Rescues from Serpent-Bites",
        "subtitle": "Baba Rescues Devotees from Poisonous Reptiles: (1) Balasaheb Mirikar -- (2) Bapu Rao Booty -- (3) Amir Shakkar -- (4) Hemadpant.",
        "topics": ["Balasaheb Mirikar at Chitali Village", "The Snake on Bapusaheb Booty's Dhoti", "Amir Shakkar's Nightly Peril", "A Snake Encounter during Hemadpant's Dialogue"]
    },
    21: {
        "title": "Yoga and Onion & Shama Cured of Snake-Bite",
        "subtitle": "Yoga and Onion -- Shama Cured of Viper Bite -- Cholera Ordinances Broken for Devotion.",
        "topics": ["The Brahmachari's Disdain for Eating Onions", "Baba's Humorous Lesson on False Asceticism", "Shama Bitten by a Deadly Viper Cured by Baba's Words", "Baba Overrules Quarantine to Save Shirdi"]
    },
    22: {
        "title": "Baba's Wit and Humour: The Roasted Grams",
        "subtitle": "Baba's Wit and Humour -- Chanak Leela (Roasted Grams) -- Lessons in Solitary Eating.",
        "topics": ["Hemadpant Massaging Baba's Legs", "Baba Accuses Him of Eating Grams Alone", "Sudama and Krishna's Parallel Story", "Sharing Everything with the Divine Before Partaking"]
    },
    23: {
        "title": "Damu Anna Kasar: Speculation & Mangoes",
        "subtitle": "Damu Anna Kasar of Ahmednagar -- Speculation in Cotton and Grain Averted -- The Blessing of Sons Through Mangoes.",
        "topics": ["Cotton Speculation Business Prevented by Baba", "Grain Speculation Loss Prevented", "Four Mangoes Blessed for Damu Anna's Wife", "Devotion Tested and Rewarded"]
    },
    24: {
        "title": "Stories of Bhakta Pant, Pitale & Ambdekar",
        "subtitle": "Stories of (1) Bhakta Pant -- (2) Harishchandra Pitale -- (3) Gopal Ambdekar Averted from Suicide.",
        "topics": ["Bhakta Pant Relieved of Chronic Stomach Ailment", "Harishchandra Pitale's Son Restored to Life", "Baba Returns Two Old Coins of Grace", "Gopal Ambdekar Saved from Despair at the Well"]
    },
    25: {
        "title": "Favour Shown by Giving Sacred Books",
        "subtitle": "Favour Shown by Giving the Bhagwat to Kaka Mahajani and Vishnu-Sahasranama to Shama.",
        "topics": ["Kaka Mahajani Blessed with Eknath Bhagwat", "Baba Procures Vishnu Sahasranama for Shama", "Shama's Reluctance Overcome", "The Efficacy of Chanting the Thousand Names of Lord Vishnu"]
    },
    26: {
        "title": "Sparrows Drawn to Shirdi",
        "subtitle": "Baba Draws Devotees Like Sparrows Tied with Thread: (1) Lakhamichand -- (2) Burhanpore Lady -- (3) Megha.",
        "topics": ["Lakhamichand's Doubts Cleared", "The Lady from Burhanpore and the Khichadi Offering", "Megha's Brahmin Orthodoxy Transformed", "Megha's Funeral Conducted by Baba with Tears"]
    },
    27: {
        "title": "Madrasi Bhajani Mela & The Tendulkars",
        "subtitle": "Stories of (1) The Madrasi Bhajani Mela (Blessing of Ramdasi) -- (2) Tendulkar Father and Son Passed in Medical Exam.",
        "topics": ["The Madrasi Bhajani Mela's Journey", "Baba Appears in Dream with Saffron Cloth", "Babu Tendulkar's Medical Examination Cleared", "Dr. Tendulkar's Pension Granted"]
    },
    28: {
        "title": "Drawn to Shirdi: Kakaji Vaidya & Khushalchand",
        "subtitle": "Devotees Drawn to Shirdi: (1) Kakaji Vaidya of Vani -- (2) Ramlal Punjabi -- (3) Khushalchand of Rahata.",
        "topics": ["Goddess Saptashringi Directs Kakaji to Shirdi", "Ramlal Punjabi Sees Baba's Form in a Vision", "Baba Sends Tanga to Rahata for Khushalchand", "Baba's Royal Hospitality"]
    },
    29: {
        "title": "The Passing Away of Devotees in Baba's Presence",
        "subtitle": "The Sacred Passing Away in Baba's Holy Presence: (1) Sannyasi Vijayanand -- (2) Balaram Mankar -- (3) Tatyasaheb Noolkar.",
        "topics": ["Vijayanand Sannyasi from Madras Saved from Returning Home", "Balaram Mankar Blessed with Peace in Bandra and Machhindragad", "Tatyasaheb Noolkar Passes Away Peacefully in Shirdi"]
    },
    30: {
        "title": "In Quest of Guru and God: Fasting Disapproved",
        "subtitle": "In Quest of Guru and God -- Four Companions in the Forest -- Fasting Disapproved: Stories of Mrs. Gokhale and Dada Kelkar.",
        "topics": ["Four Travellers in the Forest Discussing How to Find God", "The Guru Disguised as a Vanjari Offers Food", "Fasting Ruled Out: 'God Lives Not in an Empty Belly'", "Mrs. Gokhale's Fast Broken with Sweet Puran Polis"]
    },
    31: {
        "title": "The Greatness of Udi: Scorpions, Jamner & Plague",
        "subtitle": "The Efficacy and Greatness of Baba's Sacred Udi (Ash) -- Scorpion Sting Cured -- The Jamner Miracle -- Plague Averted.",
        "topics": ["Significance of the Sacred Fire (Dhuni) and Udi", "Narayanrao Jani's Scorpion Sting Relieved", "Nanasaheb Chandorkar's Daughter Saved in Jamner by Udi and Arati", "Dr. Chidambar Cured of Bubonic Plague"]
    },
    32: {
        "title": "Greatness of Udi (Continued): Diseases Healed",
        "subtitle": "More Miraculous Healings by Udi: Harda Doctor's Nephew -- Dr. Pillay's Guinea-Worms -- Shama's Sister-in-Law.",
        "topics": ["Harda Doctor's Nephew Healed", "Dr. Pillay Suffering from Severe Guinea-Worms", "Baba Takes upon Himself the Past Sins of Devotees", "Shama's Sister-in-Law Cured of Bubonic Plague Swelling"]
    },
    33: {
        "title": "Tested and Never Found Wanting",
        "subtitle": "Tested and Never Found Wanting -- Kaka Mahajani's Friend -- Bandu's Examination -- Story of Kanyadan.",
        "topics": ["A Skeptical Friend Tested by Baba", "Bandu Clears His Difficult Exam", "Baba Provides Money for Kanyadan (Daughter's Wedding)", "Baba's Protection for Those Who Put Their Faith in Him"]
    },
    34: {
        "title": "Wonderful Stories of Two Goats & Mrs. Aurangabadkar",
        "subtitle": "Baba's Omniscience and Reminiscences: The Story of Two Goats -- Mrs. Aurangabadkar Blessed with a Child.",
        "topics": ["Two Goats Bought by Baba for Thirty-Two Rupees", "Past Birth Karma of the Two Human Brothers", "Mrs. Aurangabadkar's Long Wait for a Child", "Coconut Blessing Brings Joy"]
    },
    35: {
        "title": "The Grand Chavadi Procession",
        "subtitle": "The Majestic Chavadi Procession Every Alternate Night -- Grandeur, Devotion, and Love of the Bhaktas.",
        "topics": ["Chavadi Procession Origin and Significance", "Devotees Dressing Baba in Royal Regalia", "Palanquin, Fireworks, Bhajans, and Torches", "Baba Gazing at the Sun with Radiant Splendour"]
    },
    36: {
        "title": "Baba's Handi & Feeding the Poor",
        "subtitle": "Baba's Handi (Cooking Pot) -- Feeding the Poor and Devotees -- Kala (Hodge-Podge) -- Offering Food to Animals.",
        "topics": ["Baba Cooking with His Own Hands in Large Handis", "Meat and Vegetarian Dishes Prepared Impartially", "Stirring Boiling Broth with Bare Hands", "Kala: Mixing Offerings Together at Noon Arati"]
    },
    37: {
        "title": "Baba's Knowledge of Sanskrit & Gita IV.34",
        "subtitle": "Baba's Profound Knowledge of Sanskrit -- Unique Exegesis of Bhagawad Gita Chapter IV, Verse 34 with Nanasaheb Chandorkar.",
        "topics": ["Nanasaheb Chandorkar Reciting Bhagawad Gita", "Baba Questions the Exact Meaning of 'Pariprashna' and 'Seva'", "Differentiating Jnana from Ajnana", "The Nature of a True Sadguru Revealing Brahman"]
    },
    38: {
        "title": "Stories of Baba: Attending Mrs. Deo's Udyapan",
        "subtitle": "Stories of Baba: (1) Attending Mrs. Deo's Udyapan Ceremony as a Sannyasi with Two Companions -- (2) Baba Visiting Hemadpant's House in the Form of a Picture.",
        "topics": ["B. V. Deo's Mother's Udyapan Ceremony at Dahanu", "Three Guests Arrive Exactly at Noon", "Hemadpant's Holi Festival Celebration in Bandra", "Picture of Sai Baba Delivered Miraculously at Mealtime"]
    },
    39: {
        "title": "Story of the Picture & Stealing Rags",
        "subtitle": "The Sacred Portrait of Sai Baba -- Ali Mahomed and the Nine Pictures -- Stealing Rags and Reading of Jnaneshwari.",
        "topics": ["Ali Mahomed's Picture Given to Bapu Saheb Tendulkar", "Baba Demands the Stolen Rags of Hemadpant", "Significance of Renouncing Attachments", "Reading Jnaneshwari and Eknathi Bhagwat Daily"]
    },
    40: {
        "title": "Baba's Passing Away (Mahasamadhi)",
        "subtitle": "Baba's Mahasamadhi -- Previous Indications -- Averting the Death of Ramachandra Dada Patil and Tatya Kote Patil.",
        "topics": ["Forewarning of Departure in October 1918", "Ramachandra Patil's Life Saved", "Tatya Kote Patil's Life Spared by Baba Taking Illness upon Himself", "The Sacred Brick Broken -- Baba's Prophecy of the End"]
    },
    41: {
        "title": "Baba's Mahasamadhi (Continued)",
        "subtitle": "Baba's Mahasamadhi Continued -- Preparation -- Samadhi-Mandir -- 72 Hours' Samadhi -- Jog's Sannyas -- Last Words.",
        "topics": ["Reading of Ramavijaya Before Departure", "Giving Nine Rupees to Laxmibai Shinde", "Resting His Head on Bayaji's Shoulder on Vijayadashami", "The Wada of Booty Chosen as the Samadhi Mandir"]
    },
    42: {
        "title": "Kakasaheb's Doubt & Anandrao's Vision",
        "subtitle": "Kakasaheb's Doubt and Anandrao's Vision -- The Wooden Plank as Baba's Bedstead -- Baba's Advice.",
        "topics": ["Kakasaheb Dixit's Spiritual Doubt Solved", "Anandrao Pakhade's Dream of Baba", "The Symbolism of the Wooden Plank", "Baba's Assurance: 'I Am Ever Living, even after My Flesh is Dead'"]
    },
    43: {
        "title": "Baba's Gaya Trip & Story of Goats",
        "subtitle": "Baba's Spiritual Presence at Gaya -- Shama's Pilgrimage to Kashi, Prayag, and Gaya -- Story of Goats.",
        "topics": ["Shama's Pilgrimage with Babasaheb Mirikar", "Baba's Portrait Found in the Priest's House at Gaya Twelve Years Earlier", "Baba's All-Pervading Presence Across Hundreds of Miles"]
    },
    44: {
        "title": "Baba's Reminiscences: Snake and Frog",
        "subtitle": "Baba's Reminiscences -- The Story of Veerbhadrappa and Chenbassappa (Snake and Frog) -- Cause of Hatred and Karma.",
        "topics": ["Baba Halts at a Small Stream", "A Large Snake Catching a Frog", "Past Life Feud between Veerbhadrappa and Chenbassappa", "The Law of Karma and Baba Rescuing Both Souls"]
    },
    45: {
        "title": "Warding off Devotees' Calamities: Shevade & Sapatneker",
        "subtitle": "Warding off Devotees' Calamities -- Stories of (1) Mr. Shevade -- (2) Mr. Sapatneker of Madhi.",
        "topics": ["Signs of a True Sad-guru", "Shevade's Law Exam Success Foretold by Baba", "Sapatneker's Grief over Lost Son Consoled", "Baba Restores Sapatneker's Family Joy"]
    },
    46: {
        "title": "Stories of Hari Kanoba, Somadeva & Nanasaheb",
        "subtitle": "Stories of (1) Hari Kanoba of Bombay -- (2) Somadeva Swami of Hardwar -- (3) Nanasaheb Chandorkar's Test.",
        "topics": ["Hari Kanoba Tests Baba's Omniscience with a New Turban", "Somadeva Swami Terrified by Flying Flags, Pacified by Baba", "Nanasaheb Chandorkar's Devotion to Devi at Padmalaya"]
    },
    47: {
        "title": "Stories of Kakasaheb Dixit, Tembye Swami & Dhurandhar",
        "subtitle": "Stories of (1) Kakasaheb Dixit -- (2) Shri Tembye Swami (Vasudevananda Saraswati) -- (3) Balaram Dhurandhar.",
        "topics": ["Kakasaheb Dixit's Unshakable Faith in Baba's Words", "Tembye Swami Sends a Coconut to Baba via Pundalikrao", "Baba Detects the Broken Coconut", "Balaram Dhurandhar's Vision of Baba's Divine Feet"]
    },
    48: {
        "title": "Epilogue: Concluding Remarks & Fala-Shruti",
        "subtitle": "Concluding Remarks by Hemadpant -- Greatness of Sad-guru Sai -- Fala-Shruti (Reward of Daily Study).",
        "topics": ["Greatness of Sad-guru Sai, the Agasti of Mundane Existence", "Prayer for Devotees' Welfare", "Fala-Shruti: The Fruits and Blessings of Daily Study of Satcharitra", "Final Surrender at the Lotus Feet of Shri Sainath"]
    }
}

# Saptah Parayan 7-Day Mapping
SAPTAH_PARAYAN = [
    {"day": 1, "name": "Thursday (Day 1)", "desc": "Initial Leelas, Grinding Wheat, Shirdi Advent, Rama Navami", "chapters": [1, 2, 3, 4, 5, 6, 7, 8, 9]},
    {"day": 2, "name": "Friday (Day 2)", "desc": "Sagun Brahman, Experiences, Cholkar's Vow", "chapters": [10, 11, 12, 13, 14, 15]},
    {"day": 3, "name": "Saturday (Day 3)", "desc": "Brahma-Jnana, Radhabai, Ishavasya, Serpent Rescues", "chapters": [16, 17, 18, 19, 20]},
    {"day": 4, "name": "Sunday (Day 4)", "desc": "Baba's Humour, Damu Anna, Vishnu Sahasranama, Sparrows Drawn", "chapters": [21, 22, 23, 24, 25, 26]},
    {"day": 5, "name": "Monday (Day 5)", "desc": "Quest of Guru, Greatness of Udi, Testing Faith", "chapters": [27, 28, 29, 30, 31, 32, 33]},
    {"day": 6, "name": "Tuesday (Day 6)", "desc": "Chavadi, Handi, Gita Interpretation, Baba's Mahasamadhi", "chapters": [34, 35, 36, 37, 38, 39, 40, 41]},
    {"day": 7, "name": "Wednesday (Day 7)", "desc": "Post-Samadhi Leelas, Reminiscences, Fala-Shruti", "chapters": [42, 43, 44, 45, 46, 47, 48]}
]

def clean_text(text):
    if not text:
        return ""
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2013', '-').replace('\u2014', '--')
    text = text.replace('I lumour', 'Humour')
    text = text.replace("gaya Trip", "Gaya Trip")
    text = re.sub(r'\s+', ' ', text).strip()
    return text

processed_chapters = []

for idx, item in enumerate(raw_data):
    chap_id = idx + 1
    fn = item['filename']
    raw_paras = item['paras']
    
    paras = []
    for p in raw_paras:
        t = clean_text(p['text'])
        if t:
            paras.append({'text': t, 'bold': p['bold'], 'size': p['size']})
            
    meta = CHAPTER_METADATA.get(chap_id, {})
    
    # Identify Chapter Label
    if 'Chapter I.doc' in fn:
        chapter_label = "Chapter I"
        start_idx = 4
    elif 'Epilogue' in fn:
        chapter_label = "Epilogue"
        start_idx = 1
    else:
        chapter_label = paras[0]['text']
        # Clean label like 'Chapter XXXIX & L' -> 'Chapter XXXIX'
        if chap_id == 37:
            chapter_label = "Chapter XXXIX"
        elif chap_id == 47:
            chapter_label = "Chapter L"
            
        # Determine start index of body text
        p1 = paras[1]['text']
        p2 = paras[2]['text'] if len(paras) > 2 else ""
        if len(paras) > 2 and (paras[1]['bold'] == -1 or p1.isupper() or len(p1) < 60) and len(p2) > 30 and ('-' in p2 or '--' in p2):
            start_idx = 3
        else:
            start_idx = 2

    title = meta.get("title", paras[1]['text'] if len(paras) > 1 else chapter_label)
    subtitle = meta.get("subtitle", "")
    topics = meta.get("topics", [])
    
    elements = []
    
    # If Chapter 1, inject author portrait element
    if chap_id == 1:
        elements.append({
            'id': f'c{chap_id}-img1',
            'type': 'image',
            'src': 'assets/images/image001.jpg',
            'alt': 'Shri Govind Raghunath Dabholkar (Hemadpant)',
            'caption': 'Shri Govind Raghunath Dabholkar (Hemadpant), Author of Shri Sai Satcharitra'
        })
        
    p_counter = 1
    h_counter = 1
    
    for i in range(start_idx, len(paras)):
        p = paras[i]
        t = p['text']
        bold = p['bold']
        
        # Check for benediction
        if re.search(r'bow to shri sai', t, re.I) or re.search(r'peace be to all', t, re.I):
            elements.append({
                'id': f'c{chap_id}-end',
                'type': 'benediction',
                'text': t
            })
            continue
            
        # Check if heading
        is_heading = False
        if bold == -1 and len(t) < 80 and not t.endswith('.'):
            is_heading = True
        elif bold == -1 and len(t) < 60 and not t.endswith('?"') and not t.endswith('!"'):
            is_heading = True
        elif t in ['Preliminary', 'Mission of the Saints', 'Special Characteristic of Baba', 'Signs of Sad-guru', 'Greatness of Udi', 'Previous Preparation', 'Greatness of Sad-guru Sai', 'Prayer', 'Fala-Shruti (Reward of Study)', 'Object of Writing the Work', 'Incapacity and Boldness in Undertaking the Work', 'Hot Discussion', 'Significant and Prophetic Title', 'About the Necessity of a Guru']:
            is_heading = True
            
        if is_heading:
            elements.append({
                'id': f'c{chap_id}-h{h_counter}',
                'type': 'heading',
                'text': t
            })
            h_counter += 1
        else:
            # Check if verse
            if t.startswith("'Tadviddhi") or t.startswith("Upadekshyanti"):
                elements.append({
                    'id': f'c{chap_id}-p{p_counter}',
                    'type': 'verse',
                    'text': t
                })
            else:
                elements.append({
                    'id': f'c{chap_id}-p{p_counter}',
                    'type': 'paragraph',
                    'text': t
                })
            p_counter += 1
            
    all_text = " ".join([el['text'] for el in elements if el['type'] != 'image'])
    word_count = len(all_text.split())
    reading_time = max(1, round(word_count / 200))
    
    processed_chapters.append({
        'id': chap_id,
        'filename': fn,
        'chapterLabel': chapter_label,
        'title': title,
        'subtitle': subtitle,
        'topics': topics,
        'wordCount': word_count,
        'readingTime': reading_time,
        'elements': elements
    })

book_data = {
    'title': 'Shri Sai Satcharitra',
    'subtitle': 'The Life and Teachings of Shirdi Sai Baba',
    'author': 'Govind Raghunath Dabholkar (Hemadpant)',
    'translator': 'Nagesh Vasudev Gunaji',
    'totalChapters': len(processed_chapters),
    'totalWords': sum(ch['wordCount'] for ch in processed_chapters),
    'parayanSchedule': SAPTAH_PARAYAN,
    'chapters': processed_chapters
}

os.makedirs('data', exist_ok=True)
os.makedirs('js', exist_ok=True)

# Save JSON file
with open('data/chapters.json', 'w', encoding='utf-8') as f:
    json.dump(book_data, f, ensure_ascii=False, indent=2)

# Save JS bundle file for instant local execution
js_content = "window.BOOK_DATA = " + json.dumps(book_data, ensure_ascii=False) + ";\n"
with open('js/book-data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated data/chapters.json and js/book-data.js successfully!")
print(f"Total chapters: {len(processed_chapters)}, Total words: {book_data['totalWords']}")
