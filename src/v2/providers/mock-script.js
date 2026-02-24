export class MockScriptProvider {
  async generate(_clip) {
    return {
      text: 'Mock script: 3 productivity tips for crushing your day. Tip 1: Start early. Tip 2: Stay focused. Tip 3: Review your wins.',
      hashtags: ['#productivity', '#tips', '#automation'],
    };
  }
}
