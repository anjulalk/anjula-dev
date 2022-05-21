import '@/styles/index.scss';
import { startConsole } from './console';
import { Greetings } from './js/constants';

startConsole([Greetings.ENGLISH, Greetings.SINHALA, Greetings.TAMIL], 'text');
