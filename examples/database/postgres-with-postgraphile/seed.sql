insert into public.user (id, name, email, password)
values ('c998b053-2577-419a-8962-25d8903c6565', 'John Doe', 'john@doe.com', 'wowmuchsecret');

insert into task (id, created_by_id, status, title)
values ('84ebf385-0782-4e8c-ac17-6b7b2db6cd05', 'c998b053-2577-419a-8962-25d8903c6565', 'TODO', 'Drink coffee after breakfast');
