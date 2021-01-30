/* global Jmvc */

const app = document.getElementById('app');

// jmvc({ name: 'test' });

// const jmodel = new Jmvc.Model({});

// console.log(jmodel);

Jmvc.View.Test()
	.setModel(new Jmvc.Model({ id: 'New ID' }))
	.appendTo(app)
	.render();

// console.log(view);

// const jCollection = jmvc([
// 	['DATA 0.0', 'DATA 0.1', 'DATA 0.2'],
// 	['DATA 1.0', 'DATA 1.1', 'DATA 1.2'],
// 	['DATA 2.0', 'DATA 2.1', 'DATA 2.2']
// ]);

// jmvc.view('table')
// 	.matrix(jCollection)
// 	.appendTo(app)
// 	.render();

// const obj1 = {};

// jmvc(obj1)
// 	.on('change', () => console.log('CHANGE'))
// 	.set('id', 'id')
// 	.set('sub', { 'test': 123 });

// console.log(obj1);
// console.log(jmvc(obj1).get('sub').events, jmvc.wrapperMap.has(jmvc(obj1).get('sub').context));

// jmvc(obj1).get('sub').set('test2', 456);

// console.log('END');

// function repeating(str, length) {
// 	let returnStr = '';
// 	for (let index = 0; index < length; index++) {
// 		returnStr += str;
// 	}
// 	return returnStr;
// }

// function group(title, func, level = 0) {
// 	console.log(repeating('\t', level) + title); // eslint-disable-line no-console
// 	func(level + 1);
// }

// function assert(title, assertion, message, level) {
// 	console.log(repeating('\t', level) + title); // eslint-disable-line no-console
// 	console.assert(assertion, message); // eslint-disable-line no-console
// }

// group('GROUP TITLE', function (level) {
// 	assert('ASSERT TITLE', true, 'Assert true', level);
// 	assert('ASSERT TITLE', false, 'Assert false', level);
// 	group('GROUP TITLE', function (level) {
// 		assert('ASSERT TITLE', true, 'Assert true', level);
// 		assert('ASSERT TITLE', false, 'Assert false', level);
// 	}, level);
// });
