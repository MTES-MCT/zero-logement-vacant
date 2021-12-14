// @ts-ignore
exports.seed = function(knex) {
    return knex.table('users').insert({
        id: '8da707d6-ff58-4366-a2b3-59472c600dca',
        establishment_id: 'fb42415a-a41a-4b22-bf47-7bedfb419a63',
        email: 'user1@mail.fr',
        password: '',
        first_name: 'FirsName1',
        last_name: 'LastName1',
    })
};
