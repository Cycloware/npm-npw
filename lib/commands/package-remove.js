"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
exports.package_remove = {
    command: `remove [${"packages" /* packages */}..]`,
    aliases: ['+'],
    desc: 'Set a config variable',
    builder: (yargs) => yargs
        .options({
        ["packages" /* packages */]: {
            description: 'Name of package(s) to remove.',
            array: true,
            string: true,
            required: true,
            coerce: (val) => {
                // if(Array.isArray(val))
                // {
                //   return val.map(p=> p !== )
                // }
                // console.log(`coerce pkg: ${val}`)
                return val;
            }
        },
        'global': {
            alias: 'g',
            boolean: true,
            array: false,
            default: false,
            description: 'Remove global package.'
        }
    }),
    handler: (argvIn) => {
        console.log(`Dumping argv: ${JSON.stringify(argvIn, null, 1).white}`.gray);
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1yZW1vdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvcGFja2FnZS1yZW1vdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZ0I7QUE2QkgsUUFBQSxjQUFjLEdBQXdCO0lBQ2pELE9BQU8sRUFBRSxXQUFXLHlCQUFlLEtBQUs7SUFDeEMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQ2QsSUFBSSxFQUFFLHVCQUF1QjtJQUM3QixPQUFPLEVBQUUsQ0FBQyxLQUFLLEtBQUssS0FBSztTQUN0QixPQUFPLENBQUM7UUFDUCwyQkFBaUIsRUFBRTtZQUNqQixXQUFXLEVBQUUsK0JBQStCO1lBQzVDLEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFLElBQUk7WUFDWixRQUFRLEVBQUUsSUFBSTtZQUNkLE1BQU0sRUFBRSxDQUFDLEdBQVE7Z0JBQ2YseUJBQXlCO2dCQUN6QixJQUFJO2dCQUNKLCtCQUErQjtnQkFDL0IsSUFBSTtnQkFDSixvQ0FBb0M7Z0JBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDYixDQUFDO1NBQ0Y7UUFDRCxRQUFRLEVBQUU7WUFDUixLQUFLLEVBQUUsR0FBRztZQUNWLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxFQUFFLEtBQUs7WUFDWixPQUFPLEVBQUUsS0FBSztZQUNkLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEM7S0FDRixDQUFDO0lBQ0osT0FBTyxFQUFFLENBQUMsTUFBTTtRQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0NBQ0YsQ0FBQSJ9