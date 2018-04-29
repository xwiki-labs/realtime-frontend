define(function () {
  var out = {};

  if (document.documentElement.lang=="fr") {
    out.errorBox_errorType_disconnected = 'Connection Perdue';
    out.errorBox_errorExplanation_disconnected = [
        'La connection au serveur a été perdue, vous pouvez vous reconnecter en rechargeant la page ',
        'en cliquant en dehors de cette boîte de dialogue.'
    ].join('');

    out.editingAlone = 'Edition seul(e)';
    out.editingWithOneOtherPerson = 'Edition avec une autre personne';
    out.editingWith = 'Edition avec';
    out.otherPeople = 'autres personnes';
    out.disconnected = 'Déconnecté';
    out.synchronizing = 'Synchronisation';
    out.reconnecting = 'Reconnection...';
    out.lag = 'Lag';

    out.initialState = [
        '<p>',
        '</p>',
    ].join('');

    out.codeInitialState = [
        '\n'
    ].join('');
  } else {
    out.errorBox_errorType_disconnected = 'Connection Lost';
    out.errorBox_errorExplanation_disconnected = [
        'Lost connection to server, you may reconnect by reloading the page or review your work ',
        'by clicking outside of this box.'
    ].join('');

    out.editingAlone = 'Editing alone';
    out.editingWithOneOtherPerson = 'Editing with one other person';
    out.editingWith = 'Editing with';
    out.otherPeople = 'other people';
    out.disconnected = 'Disconnected';
    out.synchronizing = 'Synchronizing';
    out.reconnecting = 'Reconnecting...';
    out.lag = 'Lag';

    out.initialState = [
        '<p>',
        '</p>',
    ].join('');

    out.codeInitialState = [
        '\n'
    ].join('');
  }

  return out;
});
