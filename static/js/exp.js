//Data
(function(){
    
    psiturk = new PsiTurk(uniqueId, adServerLoc, mode); //Initialise PsiTurk

    const block_para_lists = [{
        instruction: "<p>blah blah blah</p>",
        stim_csv: "wordlist_p1.csv",
        debrief: "<p>blah blah blah</p>",
        feedback:true
    },
    {
        instruction: "<p>blah blah blah</p>",
        stim_csv: "wordlist_p2.csv",
        debrief: "<p>blah blah blah</p>",
        feedback:true
    },
    {
        instruction: "<p>blah blah blah</p>",
        stim_csv: "wordlist_exp.csv",
        debrief: "<p>blah blah blah</p>",
        feedback:false,
        split: function(stim_list){
        var n = 4;
        var valence_type = [...new Set(stim_list.map(stim => stim.valence))];  //got all valence types
        var block_size = stim_list.length / n; 
        if (!Number.isInteger(block_size)) {
            alert('The no. of stimuli is not divisible by the block no. required. Some stimuli will not be used.');
            block_size = Math.floor(block_size);
        }
            var n_stim_per_valence = {};
        var sorted_list = {};
        var block_list = [];
        
            valence_type.forEach(function(w) { 
            sorted_list[w] = jsPsych.randomization.shuffle(stim_list.filter(stim=>stim.valence==w));
            n_stim_per_valence[w] = sorted_list[w].length;
            });

        for (i = 0;i<n;i++) {
            let block = [];
            valence_type.forEach(w=>block.push(...sorted_list[w].slice(i*n_stim_per_valence[w]/n,
                i*n_stim_per_valence[w]/n + n_stim_per_valence[w]/n )));
            block_list.push(jsPsych.randomization.shuffle(block))
        }
        
        return block_list;

        }
    }
    ];

    const fixation = {
    type: 'html-keyboard-response',
    stimulus: '<p class="stimulus">+</p>',
    choices: jsPsych.NO_KEYS,
    trial_duration: 1000,
    post_trial_gap: 500
    }

    const instruction_text = '<p>Blah Blah Blah</p>'+
        '<p>Blah Blah Blah Blah</p>';


    const debrief_text ="<p>blah blah blah DONE</p>";

    //for testing purpose only to be deleted
    const test_stimuli = [
    {prime: 'woman', valence: 'neutral', stem: 'gent_eman', correct_ans:'a'},
    {prime: 'hey', valence: 'neutral', stem: 'hel_o', correct_ans:'l'}

    ];


    //Functions

    function buildInstruction(text) {
    return  {
        type: 'html-keyboard-response', 
        //please refine the instruction below, use <p> and </p> to surround every line"
        stimulus: text +
        '<p>When you are ready to begin, press Y or N.</p>',
        choices: ['y','n']
    }
    }

    function buildDebrief(text) {
    return {
        type: 'html-keyboard-response',
        stimulus: "<p>blah blah blah DONE</p>" ,
        prompt: "<p>press any key to take a look on the data</p>" 
    }
    }
    //Promisify
    function readAndBuildBlock(block_para) {
    return new Promise(function(resolve, reject){
        Papa.parse(csv_path + block_para.stim_csv,{
        download : true,
        header : true,
    skipEmptyLines: true,
        complete: function(results){
        resolve(buildBlock(block_para, results.data));
        }
        });
    });
    }

    function buildBlock(block_para, results) {
    function buildSimpleBlock(block_para,results) {
        return {timeline:[buildInstruction(block_para.instruction),
                trials(results,block_para.feedback),
        buildDebrief(block_para.debrief)]
        }
    }
        var block;
        if (typeof block_para.split === "undefined") {
        return buildSimpleBlock(block_para,results);
        } else {
        block_list = block_para.split(results);
        var timeline = [];
        block_list.forEach(function(w){
            timeline.push(buildSimpleBlock(block_para,w))
        })
    return {'timeline':timeline} ;
        }
        
    }

    function trials(stimuli, feedback  = false) {
        result = {
        timeline_variables: stimuli,
        randomize_order: true,
        timeline: [
        fixation,
        {
            type: 'html-keyboard-response',
            stimulus: function(){ return "<p class='stimulus'><br/></p><p class='stimulus'>"+jsPsych.timelineVariable('prime',true)+"</p><p class='stimulus'><br/></p>" ; },
            choices: jsPsych.NO_KEYS,
            trial_duration: 750,
        },
        {
            type: 'html-keyboard-response',
            stimulus: function(){ return "<p class='stimulus'><br/></p><p class='stimulus'>"+jsPsych.timelineVariable('prime',true)+"</p>";},
            prompt:function(){return "<p class='stimulus'>"+jsPsych.timelineVariable('stem',true)+"</p>"; }, 
            
            choices: [' '],
            trial_duration: 10000
        },
        {
            type: 'html-keyboard-response',
            stimulus: function(){ return "<p class='stimulus'>What is the missing letter?</p>"; },
            trial_duration: 6000,
            data: function(){
            return {
                word_prime: jsPsych.timelineVariable('prime',true),
                word_stem: jsPsych.timelineVariable('stem',true),
                valence: jsPsych.timelineVariable('valence',true),
                correctans : jsPsych.timelineVariable('correct_ans',true)
            }
            },
            on_finish: function(data){
                if (data.key_press == jsPsych.pluginAPI.convertKeyCharacterToKeyCode(jsPsych.timelineVariable('correct_ans',true))) {
                    data.correct = true; 
                } else {
                    data.correct = false;
                }
            }
        },
        { //post trial gap
            type: 'html-keyboard-response',
            trial_duration: 0,
            on_finish: function() {
                psiturk.recordTrialData(jsPsych.data.getLastTrialData());
                psiturk.saveData();
            }
        }
        ]
        }
        if (feedback) {
        result.timeline.push({
            
            type: 'html-keyboard-response',
            stimulus: function(){ return `<p class='stimulus'>${(jsPsych.data.getLastTrialData().values()[0].correct?'Correct':'Wrong')}</p>`; },
            trial_duration: 1000
        })
        }
        return result;
    }

    //Enviornment constant and variables
    const csv_path = "./static/csv/";
    let promises = [];
    var timeline = [];



    //main()
    for (const block_para of block_para_lists) {
    promises.push(readAndBuildBlock(block_para));
    }



    Promise.all(promises).then(function(){
    timeline.push(buildInstruction(instruction_text));
    for(const block of arguments[0]) {
        timeline.push(block);
    }
    timeline.push(buildDebrief(debrief_text));
    jsPsych.init({
        timeline: timeline,
        on_finish: function() {
            jsPsych.data.displayData();
        },
        default_iti: 0
    });

    })
}).call(this);
