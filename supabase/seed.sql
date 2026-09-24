-- Starter content for the Orangopus site. Safe to re-run.
-- Edit these rows later in the Supabase dashboard (Table editor).

insert into public.faqs (question, answer, category, order_index)
select * from (values
  ('What is Orangopus?', 'Orangopus is a grassroots nonprofit open collective supporting creators of all backgrounds. No gatekeepers, no agendas.', 'general', 1),
  ('Who is this for?', 'Creators, developers, dreamers and anyone interested in collaborative, open-source projects.', 'general', 2),
  ('How do I get started?', 'Explore our projects on GitHub, join our Discord community, or contribute to one of our open-source initiatives. You can also sign in and share your own project.', 'general', 3),
  ('How can I support Orangopus?', 'Contribute code, share ideas, spread the word, or make a donation to help fund our initiatives.', 'support', 4),
  ('Where does the money go?', 'As a nonprofit, every donation goes into supporting our projects, maintaining our infrastructure and making creation accessible to everyone.', 'support', 5)
) as t(question, answer, category, order_index)
where not exists (select 1 from public.faqs);

insert into public.team_members (name, role, order_index)
select * from (values
  ('Cheesecastv20053', 'Founder', 1),
  ('Ellie', 'Team', 2),
  ('Jordan', 'Team', 3),
  ('Rim', 'Team', 4),
  ('Tortle', 'Team', 5),
  ('Silasonlinux', 'Team', 6),
  ('Tvgameruk', 'Team', 7),
  ('Runawaylobster', 'Modopus', 8),
  ('Hugjunkie', 'Pentopus', 9),
  ('Bootleghumanpennythief6668', 'Octonaut', 10)
) as t(name, role, order_index)
where not exists (select 1 from public.team_members);

insert into public.site_settings (key, value, description) values
  ('github_org', 'orangopus', 'GitHub organisation shown in the Open source section'),
  ('discord_url', '', 'Invite link for the Join our Discord buttons'),
  ('contact_email', '', 'Where the Contact link in the footer goes')
on conflict (key) do nothing;
