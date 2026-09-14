-- Development-only relationship fixtures. Run through setup.js after bcrypt users and listings.
INSERT INTO favorites(user_id,item_id) VALUES(1,1),(1,2),(1,6),(2,3),(4,2),(5,2);
INSERT INTO borrow_requests(item_id,borrower_id,owner_id,start_time,end_time,purpose,message,status) VALUES
(1,1,2,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 2 DAY),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 3 DAY),'Engineering exam practice','I can collect at the library.','REQUESTED'),
(2,1,2,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 DAY),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 6 DAY),'Photography club event','I will bring my student ID.','ACCEPTED'),
(5,1,8,DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY),'Design studio assignment','Thank you for sharing!','ACCEPTED'),
(6,1,9,DATE_SUB(UTC_TIMESTAMP(),INTERVAL 3 DAY),DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY),'Hostel movie night','Returning after the event.','ACCEPTED'),
(1,4,2,DATE_SUB(UTC_TIMESTAMP(),INTERVAL 10 DAY),DATE_SUB(UTC_TIMESTAMP(),INTERVAL 9 DAY),'Calculation practice','Collected on time.','COMPLETED'),
(2,5,2,DATE_SUB(UTC_TIMESTAMP(),INTERVAL 8 DAY),DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY),'Campus portraits','Lovely camera.','COMPLETED');
INSERT INTO transactions(request_id,item_id,owner_id,borrower_id,expected_return,status,handover_time,actual_return) SELECT id,item_id,owner_id,borrower_id,end_time,CASE id WHEN 2 THEN 'ACCEPTED' WHEN 3 THEN 'ACTIVE' WHEN 4 THEN 'OVERDUE' ELSE 'COMPLETED' END,IF(id=2,NULL,start_time),IF(id>=5,DATE_SUB(end_time,INTERVAL 1 HOUR),NULL) FROM borrow_requests WHERE id>=2;
INSERT INTO transaction_events(transaction_id,actor_id,state,note) SELECT id,owner_id,status,'Development exchange history' FROM transactions;
INSERT INTO reviews(transaction_id,reviewer_id,reviewed_user_id,rating,comment) VALUES(4,4,2,5,'Easy pickup and the calculator was in excellent condition.'),(5,5,2,5,'Riya explained all the camera settings. A great first experience.');
UPDATE users SET average_rating=5,trust_score=84 WHERE id=2;
INSERT INTO conversations(request_id) SELECT id FROM borrow_requests;
INSERT INTO conversation_participants(conversation_id,user_id) SELECT c.id,r.owner_id FROM conversations c JOIN borrow_requests r ON r.id=c.request_id;
INSERT INTO conversation_participants(conversation_id,user_id) SELECT c.id,r.borrower_id FROM conversations c JOIN borrow_requests r ON r.id=c.request_id;
INSERT INTO messages(conversation_id,sender_id,body) VALUES(1,1,'Hi Riya! Would library reception work for pickup?'),(1,2,'Absolutely. Bring your student ID and we can confirm the handover together.'),(2,1,'Looking forward to trying the camera at our club event.');
INSERT INTO notifications(user_id,type,title,link) VALUES(2,'REQUEST_RECEIVED','Aarav requested your calculator','/requests/incoming'),(1,'REQUEST_ACCEPTED','Your camera request was accepted','/borrowings/1'),(1,'OVERDUE','Your speaker is overdue. Arrange the return.','/borrowings/3');
INSERT INTO circles(owner_id,name,description,rules,university,invite_code) VALUES(2,'The Shutter Club','Cameras, lenses and advice for campus photographers.','Return batteries charged.','Delhi Technological University','00000000000000000000000000000001'),(4,'Build & Tinker','A small home for big engineering experiments.','Respect shared tools.','Delhi Technological University','00000000000000000000000000000002'),(1,'Hostel Essentials','The useful things we do not all need to own.','Keep pickups on campus.','Delhi Technological University','00000000000000000000000000000003');
INSERT INTO circle_members(circle_id,user_id) VALUES(1,2),(1,1),(1,5),(2,4),(2,1),(3,1),(3,6);
INSERT INTO reports(reporter_id,target_type,target_id,reason,description) VALUES(1,'ITEM',8,'Misleading Listing','Please check whether both rackets are included.');
INSERT INTO audit_logs(admin_id,action,target_type,target_id,reason) VALUES(3,'PLATFORM_INITIALIZED','SYSTEM',1,'Development data loaded for end-to-end testing.');
