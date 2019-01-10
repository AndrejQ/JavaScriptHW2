// на случай, если в transaction() создастся новый автомат
var stackOfMachines = [];

class StateMachine {
	constructor(machineDescription) {
		for(var key in machineDescription) {
			this[key] = machineDescription[key];
		}
		// rename 'initialState' to 'state'
		this.state = this.initialState;
		delete this.initialState;
	}

	// onAction - либо onEntry, либо onExit, либо дейтвие при транзакции
	// actions - место, где должен быть метод onAction()
	runAction(onAction, actions=this.states[this.state], event) {
		if (onAction in actions) {
			let action = actions[onAction];
			// проверка, где находится action (в actions или же сразу объявлена функция)
			switch (typeof(action)) {
			case 'function':
				action();
				break;
			case 'string':
				this.actions[action](event);
				break;
			}
			return true;
		} else {
			return false;
		}
	}

	transition(transaction, event) {
		stackOfMachines.push(this);

		let currentState = this.state;
		let actions = this.states[currentState];
		this.runAction('onExit');
		if (this.runAction(transaction, actions.on, event)) {
			let service = actions.on[transaction].service;
			if (service !== undefined) {
				service(event)
			}
		} else {
			console.log('[error] there is no transaction: ' + transaction + ' in ' + currentState + ' state')
		}
		let newState = actions.on[transaction].target;
		useState()[1](newState);
		this.runAction('onEntry');

		stackOfMachines.pop();
	}
}

const machine = function(machineDescription) {
	return new StateMachine(machineDescription);
}

const useContext = function () {
	let machine = stackOfMachines[stackOfMachines.length - 1];
	return [machine.context,
		newContext => {machine.context = {...machine.context, ...newContext}}]
}

const useState = function () {
	let machine = stackOfMachines[stackOfMachines.length - 1];
	return [machine.state,
			newState => machine.state = newState]
}



//------------------------------------------TEST------------------------------------------



// machine — создает инстанс state machine (фабрика)
const vacancyMachine = machine({
	id: 'vacancy',  // У каждого может быть свой id
	initialState: 'notResponded',  // начальное состояние
	context: {id: 123},  // дополнительный контекст (payload)
	states: {  // Граф состояний и переходов между ними
		responded: {// Каждое поле — это возможное состоение
			onEntry: 'onStateEntry'  // action, который нужно выполнить при входе в это состояние. Можно задавать массивом, строкой или функцией
		},
		notResponded: {
			onExit: () => {  // action, который нужно выполнить при выходе из этого состояния. Можно задавать массивом, строкой или функцией
				console.log('we are leaving notResponded state');
			},
			on: {  // Блок описания транзакций
				RESPOND: {// Транзакция
					service: (event) => {  // упрощенный сервис, вызываем при транзакции
						const [context, setContext] = useContext();// Позволяет получить текущий контекст и изменить его
						const [state, setState] = useState();// Позволяет получить текущий стейт и изменить его
						// window.fetch({method: 'post', data: {resume: event.resume, vacancyId: context.id} })
						// .then(() => {// Поддерживаются асинхронные действия
						// 	setState('responded');  // меняем состояние
						// 	// Мержим контекст
						// 	setContext({completed: true}); // {id: 123, comleted: true}
						// });
						setState('responded');  // меняем состояние
						// Мержим контекст
						setContext({completed: true}); // {id: 123, comleted: true}
					},
					target: 'responded',  // Если не задан сервис, то просто переводим в заданный target, иначе выполняем сервис.
				}
			}
		},
	},
	actions: {// Раздел описание экшенов 
		onStateEntry: (event) => {
			const [state] = useState();
			console.log('now state is ' + state);
		},
		makeResponse: (event) => {
			const [context, setContext] = useContext();// both sync and async actions
			window.fetch({method: 'post', data: {resume: event.resume, vacancyId: context.id} })
		}
	}
})

// Пример использования StateMachine
vacancyMachine.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});
