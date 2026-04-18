-- ============================================================
-- Peak Performance Tutoring — Knowledge Base System
-- ============================================================

CREATE TABLE IF NOT EXISTS app_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('vocabulary', 'fact')),
  content JSONB NOT NULL, -- { word, type, def, ex } OR { text }
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE app_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students and staff can view active knowledge"
  ON app_knowledge_base FOR SELECT
  USING (is_active = TRUE OR auth_role() IN ('teacher', 'admin'));

CREATE POLICY "Admins manage knowledge base"
  ON app_knowledge_base FOR ALL
  USING (auth_role() = 'admin');

-- SEED DATA
INSERT INTO app_knowledge_base (category, content) VALUES
('vocabulary', '{"word": "Erudite", "type": "Adj.", "def": "Having or showing great knowledge or learning.", "ex": "Ken could turn any conversation into an erudite discussion."}'),
('vocabulary', '{"word": "Resilient", "type": "Adj.", "def": "Able to withstand or recover quickly from difficult conditions.", "ex": "She is a resilient girl who won''t let failure stop her."}'),
('vocabulary', '{"word": "Diligent", "type": "Adj.", "def": "Having or showing care and conscientiousness in one''s work.", "ex": "Success is the result of diligent effort and persistence."}'),
('vocabulary', '{"word": "Eloquence", "type": "Noun", "def": "Fluent or persuasive speaking or writing.", "ex": "His eloquence moved the entire audience to action."}'),
('vocabulary', '{"word": "Pragmatic", "type": "Adj.", "def": "Dealing with things sensibly and realistically.", "ex": "She took a pragmatic approach to solving the complex problem."}'),
('vocabulary', '{"word": "Superfluous", "type": "Adj.", "def": "Unnecessary, especially through being more than enough.", "ex": "The new rules seem superfluous as the current ones work well."}'),
('vocabulary', '{"word": "Ephemeral", "type": "Adj.", "def": "Lasting for a very short time.", "ex": "Fame in the world of social media is often ephemeral."}'),
('vocabulary', '{"word": "Sycophant", "type": "Noun", "def": "A person who acts obsequiously toward someone important in order to gain advantage.", "ex": "The king was surrounded by sycophants who praised his every move."}'),
('vocabulary', '{"word": "Ubiquitous", "type": "Adj.", "def": "Present, appearing, or found everywhere.", "ex": "Mobile phones have become ubiquitous in today''s society."}'),
('vocabulary', '{"word": "Venerable", "type": "Adj.", "def": "Accorded a great deal of respect, especially because of age, wisdom, or character.", "ex": "The venerable professor was retired after 40 years of service."}'),
('vocabulary', '{"word": "Altruistic", "type": "Adj.", "def": "Showing a disinterested and selfless concern for the well-being of others.", "ex": "His altruistic efforts helped raise millions for the charity."}'),
('vocabulary', '{"word": "Capricious", "type": "Adj.", "def": "Given to sudden and unaccountable changes of mood or behavior.", "ex": "The weather in this region is notoriously capricious."}'),
('vocabulary', '{"word": "Enervate", "type": "Verb", "def": "To cause (someone) to feel drained of energy or vitality.", "ex": "The blazing heat enervated the hikers as they climbed."}'),
('vocabulary', '{"word": "Fastidious", "type": "Adj.", "def": "Very attentive to and concerned about accuracy and detail.", "ex": "He is fastidious about keeping his workspace perfectly organized."}'),
('vocabulary', '{"word": "Garrulous", "type": "Adj.", "def": "Excessively talkative, especially on trivial matters.", "ex": "The garrulous neighbor kept me at the door for an hour."}'),
('vocabulary', '{"word": "Impetuous", "type": "Adj.", "def": "Acting or done quickly and without thought or care.", "ex": "Her impetuous decision to quit her job surprised everyone."}'),
('vocabulary', '{"word": "Lethargic", "type": "Adj.", "def": "Affected by lethargy; sluggish and apathetic.", "ex": "After the heavy meal, I felt lethargic and wanted to nap."}'),
('vocabulary', '{"word": "Meticulous", "type": "Adj.", "def": "Showing great attention to detail; very careful and precise.", "ex": "She was meticulous in her research, checking every source twice."}'),
('vocabulary', '{"word": "Nefarious", "type": "Adj.", "def": "Wicked or criminal (typically of an action or activity).", "ex": "The hacker''s nefarious activities were finally stopped by the police."}'),
('vocabulary', '{"word": "Obsequious", "type": "Adj.", "def": "Obedient or attentive to an excessive or servile degree.", "ex": "The attendants were obsequious, anticipating every whim of the VIP."}'),
('fact', '{"text": "The human brain has enough memory to hold about 2.5 petabytes of information—roughly 3 million hours of TV!"}'),
('fact', '{"text": "Regular activity can improve cognitive skills by increasing oxygen to the brain."}'),
('fact', '{"text": "The Library of Alexandria was one of the largest and most significant libraries of the ancient world."}'),
('fact', '{"text": "A group of flamingos is called a ''flamboyance''. Nature is full of art!"}'),
('fact', '{"text": "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion."}'),
('fact', '{"text": "Octopuses have three hearts and blue blood. Amazing!"}'),
('fact', '{"text": "Hot water will turn into ice faster than cold water (The Mpemba effect)."}'),
('fact', '{"text": "The shortest war in history lasted 38 to 45 minutes between Britain and Zanzibar in 1896."}'),
('fact', '{"text": "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are 3000 years old!"}'),
('fact', '{"text": "Bananas are berries, but strawberries are not. Taxonomy can be surprising!"}'),
('fact', '{"text": "Venus is the hottest planet in our solar system, with a surface temperature of about 465°C."}'),
('fact', '{"text": "Trees communicate and share nutrients through an underground network of fungi."}'),
('fact', '{"text": "The dot over the letter ''i'' and ''j'' is called a ''tittle''."}'),
('fact', '{"text": "A ''jiffy'' is an actual unit of time for 1/100th of a second."}'),
('fact', '{"text": "There are more possible iterations of a game of chess than there are atoms in the known universe."}'),
('fact', '{"text": "Wombat poop is cube-shaped to stop it from rolling away. Pure engineering!"}'),
('fact', '{"text": "Mount Everest is 29,032 feet tall, and it''s still growing at about partial inches per year."}'),
('fact', '{"text": "Cleopatra lived closer to the moon landing than to the building of the Great Pyramid."}'),
('fact', '{"text": "Glitter was invented by a cattle rancher in New Jersey in 1934."}'),
('fact', '{"text": "A bolt of lightning contains enough energy to toast 100,000 slices of bread."}');
