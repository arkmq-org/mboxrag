import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { ValidationError } from "../requests/models/ValidationError";
import { Question } from "../requests/models/Question";
import { HTTPValidationError } from "../requests/models/HTTPValidationError";
import { Error } from "../requests/models/Error";
import { Answer } from "../requests/models/Answer";
import { DefaultService } from "../requests/services/DefaultService";
export const useDefaultServiceAskAskPost = (options?: Omit<UseMutationOptions<Awaited<ReturnType<typeof DefaultService.askAskPost>>, unknown, {
    requestBody: Question;
}, unknown>, "mutationFn">) => useMutation(({ requestBody }) => DefaultService.askAskPost(requestBody), options);
