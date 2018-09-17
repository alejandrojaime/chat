import Chat from './modules.mjs';
(async () => {

	const chat = Array();
	document.querySelectorAll('chat').forEach((el)=>{
		chat.push(new Chat({container: el}));
	});

})();