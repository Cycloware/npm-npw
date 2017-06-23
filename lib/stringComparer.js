"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stringComparer;
(function (stringComparer) {
    function Sensitive(x, y) { return x === y; }
    stringComparer.Sensitive = Sensitive;
    ;
    function Insensitive(x, y) { return x.toLowerCase() === y.toLowerCase(); }
    stringComparer.Insensitive = Insensitive;
    function get(caseSensitive) { return caseSensitive ? Sensitive : Insensitive; }
    stringComparer.get = get;
})(stringComparer = exports.stringComparer || (exports.stringComparer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nQ29tcGFyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvc3RyaW5nQ29tcGFyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFpQixjQUFjLENBSzlCO0FBTEQsV0FBaUIsY0FBYztJQUM3QixtQkFBMEIsQ0FBUyxFQUFFLENBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFBbEQsd0JBQVMsWUFBeUMsQ0FBQTtJQUFBLENBQUM7SUFDbkUscUJBQTRCLENBQVMsRUFBRSxDQUFTLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQWpGLDBCQUFXLGNBQXNFLENBQUE7SUFFakcsYUFBb0IsYUFBc0IsSUFBSSxNQUFNLENBQUMsYUFBYSxHQUFHLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQS9FLGtCQUFHLE1BQTRFLENBQUE7QUFDakcsQ0FBQyxFQUxnQixjQUFjLEdBQWQsc0JBQWMsS0FBZCxzQkFBYyxRQUs5QiJ9