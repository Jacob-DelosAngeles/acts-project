// Instantiated from map.js; ESLint's single-file analysis can't see that
// cross-file usage in this non-module codebase.
/** Represents a survey respondent / simulated agent on the map. */
class Agent { // eslint-disable-line no-unused-vars
  /**
   * @param {Object} data - The agent's coded survey row.
   * @param {Object} odData - The agent's matched origin-destination row.
   */
  constructor(data, odData) {
    // // Socio-demographic and Household Characteristics
    // this.age = 'AGEB' in data ? data['AGEB'] : data['AGED'];
    // this.mem = 'MEMB' in data ? data['MEMB'] : data['MEMD'];
    // this.oveh = 'OVEHB' in data ? data['OVEHB'] : data['OVEHD'];
    // this.occu = 'OCCUB' in data ? data['OCCUB'] : data['OCCUD'];
    // this.osetup = 'OSETUPB' in data ? data['OSETUPB'] : data['OSETUPD'];
    // this.mincome = 'MINCOMEB' in data ? data['MINCOMEB'] : data['MINCOMED'];

    // // Travel Characteristics
    // this.act = data['ACT'];
    // this.expense = data['EXPENSEFM'];
    // this.travtime = data['TRAVTIMEFM'];
    // this.mode = data['MODEFM'];
    // this.dest = data['DESTFM'];

    // // Scenarios
    // this.vacc = data['VACC']
    // this.vacc_stat = data['VACCSTAT'];
    // // add more

    // // OD DATA
    // this.orig_x = od_data['ORIGX'];
    // this.orig_y = od_data['ORIGY'];
    // this.dstn_x = od_data['DSTNX'];
    // this.dstn_y = od_data['DSTNY'];

    this.data = data;
    this.od_data = odData;
  }
}
